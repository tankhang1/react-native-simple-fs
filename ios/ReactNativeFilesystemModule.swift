import ExpoModulesCore
import Foundation
import Photos
import UIKit
import UniformTypeIdentifiers

public class ReactNativeFilesystemModule: Module {
  private lazy var fileExportHandler = IOSFileExportHandler(module: self)
  private var activeDownloadDelegates: [Int: IOSDownloadTaskDelegate] = [:]
  private let activeDownloadDelegatesQueue = DispatchQueue(
    label: "ReactNativeFilesystem.activeDownloadDelegates"
  )

  // Each module class must implement the definition function. The definition consists of components
  // that describes the module's functionality and behavior.
  // See https://docs.expo.dev/modules/module-api for more details about available components.
  public func definition() -> ModuleDefinition {
    // Sets the name of the module that JavaScript code will use to refer to the module. Takes a string as an argument.
    // Can be inferred from module's class name, but it's recommended to set it explicitly for clarity.
    // The module will be accessible from `requireNativeModule('ReactNativeFilesystem')` in JavaScript.
    Name("ReactNativeFilesystem")

    Events("downloadProgress")

    AsyncFunction("getDocumentsDirectory") { () -> String in
      guard let path = self.appContext?.config.documentDirectory?.path else {
        throw NSError(
          domain: "ReactNativeFilesystem",
          code: 500,
          userInfo: [NSLocalizedDescriptionKey: "Unable to resolve the iOS documents directory."]
        )
      }

      return path
    }

    AsyncFunction("exists") { (path: String) -> Bool in
      FileManager.default.fileExists(atPath: path)
    }

    AsyncFunction("readFile") { (path: String) throws -> String in
      guard FileManager.default.fileExists(atPath: path) else {
        throw NSError(
          domain: "ReactNativeFilesystem",
          code: 404,
          userInfo: [NSLocalizedDescriptionKey: "File does not exist at path: \(path)"]
        )
      }

      return try String(contentsOfFile: path, encoding: .utf8)
    }

    AsyncFunction("writeFile") { (path: String, contents: String) throws in
      let url = URL(fileURLWithPath: path)
      let parentDirectory = url.deletingLastPathComponent()

      try FileManager.default.createDirectory(
        at: parentDirectory,
        withIntermediateDirectories: true,
        attributes: nil
      )
      try contents.write(to: url, atomically: true, encoding: .utf8)
    }

    AsyncFunction("saveImageToLibrary") { (path: String, options: [String: Any]?) async throws -> [String: Any?] in
      try await self.ensurePhotoLibraryAccess(level: .addOnly)

      let sourceURL = try self.resolveLocalFileURL(from: path)
      guard FileManager.default.fileExists(atPath: sourceURL.path) else {
        throw NSError(
          domain: "ReactNativeFilesystem",
          code: 404,
          userInfo: [NSLocalizedDescriptionKey: "File does not exist at path: \(path)"]
        )
      }

      let localIdentifier = try await self.createPhotoAsset(
        from: sourceURL,
        filename: options?["filename"] as? String
      )
      let asset = try self.fetchPhotoAsset(localIdentifier: localIdentifier)
      return self.serializeImageAsset(asset)
    }

    AsyncFunction("getImages") { (options: [String: Any]?) async throws -> [[String: Any?]] in
      try await self.ensurePhotoLibraryAccess(level: .readWrite)

      let fetchOptions = PHFetchOptions()
      fetchOptions.sortDescriptors = [NSSortDescriptor(key: "creationDate", ascending: false)]
      if let limit = (options?["limit"] as? NSNumber)?.intValue, limit > 0 {
        fetchOptions.fetchLimit = limit
      } else {
        fetchOptions.fetchLimit = 50
      }

      let assets = PHAsset.fetchAssets(with: .image, options: fetchOptions)
      var results: [[String: Any?]] = []
      results.reserveCapacity(assets.count)

      assets.enumerateObjects { asset, _, _ in
        results.append(self.serializeImageAsset(asset))
      }

      return results
    }

    AsyncFunction("deleteImageFromLibrary") { (options: [String: Any]) async throws in
      try await self.ensurePhotoLibraryAccess(level: .readWrite)

      let localIdentifier = try self.resolvePhotoAssetLocalIdentifier(from: options)
      try await self.deletePhotoAsset(localIdentifier: localIdentifier)
    }

    AsyncFunction("downloadFile") { (urlString: String, destinationPath: String, options: [String: Any]?) async throws -> [String: Any] in
      if (options?["saveToDownloads"] as? Bool) == true {
        throw NSError(
          domain: "ReactNativeFilesystem",
          code: 400,
          userInfo: [NSLocalizedDescriptionKey: "saveToDownloads is only supported on Android. Use writeFileToDownloads() on iOS."]
        )
      }

      let sourceURL = try self.createDownloadSourceURL(from: urlString)
      let (temporaryURL, response) = try await self.performDownload(
        from: sourceURL,
        urlString: urlString,
        destinationPath: destinationPath,
        explicitMimeType: options?["mimeType"] as? String,
        progressId: options?["progressId"] as? String,
        progressIntervalMs: (options?["onProgressIntervalMs"] as? NSNumber)?.intValue ?? 0
      )

      let httpResponse = response

      guard (200...299).contains(httpResponse.statusCode) else {
        throw NSError(
          domain: "ReactNativeFilesystem",
          code: httpResponse.statusCode,
          userInfo: [NSLocalizedDescriptionKey: "Download failed with HTTP \(httpResponse.statusCode) for URL: \(urlString)"]
        )
      }

      let destinationURL = self.resolveDownloadDestinationURL(
        from: URL(fileURLWithPath: destinationPath),
        response: httpResponse,
        explicitMimeType: options?["mimeType"] as? String
      )

      try FileManager.default.createDirectory(
        at: destinationURL.deletingLastPathComponent(),
        withIntermediateDirectories: true,
        attributes: nil
      )

      if FileManager.default.fileExists(atPath: destinationURL.path) {
        try FileManager.default.removeItem(at: destinationURL)
      }

      do {
        try FileManager.default.moveItem(at: temporaryURL, to: destinationURL)
      } catch {
        if FileManager.default.fileExists(atPath: destinationURL.path) {
          try? FileManager.default.removeItem(at: destinationURL)
        }
        throw error
      }

      let attributes = try FileManager.default.attributesOfItem(atPath: destinationURL.path)
      let bytesWritten = (attributes[.size] as? NSNumber)?.int64Value ?? 0

      self.emitDownloadProgress(
        url: urlString,
        destinationPath: destinationURL.path,
        progressId: options?["progressId"] as? String,
        bytesWritten: bytesWritten,
        contentLength: response.expectedContentLength
      )

      return [
        "path": destinationURL.path,
        "bytesWritten": bytesWritten,
        "statusCode": httpResponse.statusCode
      ]
    }

    AsyncFunction("writeFileToDownloads") { (filename: String, contents: String, mimeType: String?, promise: Promise) in
      guard !filename.isEmpty else {
        promise.reject("ERR_INVALID_FILENAME", "Filename cannot be empty.")
        return
      }

      do {
        let temporaryURL = try self.createTemporaryExportFile(
          named: filename,
          contents: contents,
          mimeType: mimeType
        )
        self.fileExportHandler.presentDocumentPicker(for: temporaryURL, promise: promise)
      } catch {
        promise.reject(error)
      }
    }.runOnQueue(.main)

    AsyncFunction("deleteFile") { (path: String) throws in
      guard FileManager.default.fileExists(atPath: path) else {
        return
      }

      try FileManager.default.removeItem(atPath: path)
    }

    AsyncFunction("mkdir") { (path: String) throws in
      try FileManager.default.createDirectory(
        atPath: path,
        withIntermediateDirectories: true,
        attributes: nil
      )
    }

    AsyncFunction("readdir") { (path: String) throws -> [String] in
      var isDirectory: ObjCBool = false
      let exists = FileManager.default.fileExists(atPath: path, isDirectory: &isDirectory)

      guard exists else {
        throw NSError(
          domain: "ReactNativeFilesystem",
          code: 404,
          userInfo: [NSLocalizedDescriptionKey: "Directory does not exist at path: \(path)"]
        )
      }

      guard isDirectory.boolValue else {
        throw NSError(
          domain: "ReactNativeFilesystem",
          code: 400,
          userInfo: [NSLocalizedDescriptionKey: "Path is not a directory: \(path)"]
        )
      }

      return try FileManager.default.contentsOfDirectory(atPath: path)
    }

    AsyncFunction("stat") { (path: String) throws -> [String: Any] in
      var isDirectory: ObjCBool = false
      let exists = FileManager.default.fileExists(atPath: path, isDirectory: &isDirectory)

      if !exists {
        return [
          "path": path,
          "exists": false,
          "isFile": false,
          "isDirectory": false,
          "size": 0,
          "modificationTime": NSNull()
        ]
      }

      let attributes = try FileManager.default.attributesOfItem(atPath: path)
      let fileSize = (attributes[.size] as? NSNumber)?.int64Value ?? 0
      let modificationDate = attributes[.modificationDate] as? Date

      return [
        "path": path,
        "exists": true,
        "isFile": !isDirectory.boolValue,
        "isDirectory": isDirectory.boolValue,
        "size": fileSize,
        "modificationTime": modificationDate?.timeIntervalSince1970 ?? NSNull()
      ]
    }

    AsyncFunction("move") { (from: String, to: String) throws in
      guard FileManager.default.fileExists(atPath: from) else {
        throw NSError(
          domain: "ReactNativeFilesystem",
          code: 404,
          userInfo: [NSLocalizedDescriptionKey: "Source path does not exist: \(from)"]
        )
      }

      let destinationURL = URL(fileURLWithPath: to)
      try FileManager.default.createDirectory(
        at: destinationURL.deletingLastPathComponent(),
        withIntermediateDirectories: true,
        attributes: nil
      )

      if FileManager.default.fileExists(atPath: to) {
        try FileManager.default.removeItem(atPath: to)
      }

      do {
        try FileManager.default.moveItem(atPath: from, toPath: to)
      } catch {
        try self.copyItem(from: from, to: to)
        try FileManager.default.removeItem(atPath: from)
      }
    }

    AsyncFunction("copy") { (from: String, to: String) throws in
      try self.copyItem(from: from, to: to)
    }

    // Enables the module to be used as a native view. Definition components that are accepted as part of the
    // view definition: Prop, Events.
    View(ReactNativeFilesystemView.self) {
      // Defines a setter for the `url` prop.
      Prop("url") { (view: ReactNativeFilesystemView, url: URL) in
        if view.webView.url != url {
          view.webView.load(URLRequest(url: url))
        }
      }

      Events("onLoad")
    }
  }

  private func copyItem(from: String, to: String) throws {
    guard FileManager.default.fileExists(atPath: from) else {
      throw NSError(
        domain: "ReactNativeFilesystem",
        code: 404,
        userInfo: [NSLocalizedDescriptionKey: "Source path does not exist: \(from)"]
      )
    }

    let destinationURL = URL(fileURLWithPath: to)
    try FileManager.default.createDirectory(
      at: destinationURL.deletingLastPathComponent(),
      withIntermediateDirectories: true,
      attributes: nil
    )

    if FileManager.default.fileExists(atPath: to) {
      try FileManager.default.removeItem(atPath: to)
    }

    try FileManager.default.copyItem(atPath: from, toPath: to)
  }

  private func performDownload(
    from sourceURL: URL,
    urlString: String,
    destinationPath: String,
    explicitMimeType: String?,
    progressId: String?,
    progressIntervalMs: Int
  ) async throws -> (URL, HTTPURLResponse) {
    try await withCheckedThrowingContinuation { continuation in
      let delegate = IOSDownloadTaskDelegate(
        progressIntervalMs: progressIntervalMs,
        onProgress: { [weak self] bytesWritten, contentLength, response in
          guard let self else {
            return
          }

          let resolvedDestinationPath = response.map {
            self.resolveDownloadDestinationURL(
              from: URL(fileURLWithPath: destinationPath),
              response: $0,
              explicitMimeType: explicitMimeType
            ).path
          } ?? destinationPath

          self.emitDownloadProgress(
            url: urlString,
            destinationPath: resolvedDestinationPath,
            progressId: progressId,
            bytesWritten: bytesWritten,
            contentLength: contentLength
          )
        },
        onComplete: { [weak self] result, taskIdentifier in
          self?.setActiveDownloadDelegate(nil, for: taskIdentifier)
          continuation.resume(with: result)
        }
      )

      let session = URLSession(
        configuration: .default,
        delegate: delegate,
        delegateQueue: nil
      )
      delegate.session = session

      let task = session.downloadTask(with: sourceURL)
      delegate.taskIdentifier = task.taskIdentifier
      self.setActiveDownloadDelegate(delegate, for: task.taskIdentifier)
      task.resume()
    }
  }

  private func createDownloadSourceURL(from urlString: String) throws -> URL {
    guard let url = URL(string: urlString), let scheme = url.scheme?.lowercased() else {
      throw NSError(
        domain: "ReactNativeFilesystem",
        code: 400,
        userInfo: [NSLocalizedDescriptionKey: "Invalid URL: \(urlString)"]
      )
    }

    guard scheme == "https" || scheme == "http" else {
      throw NSError(
        domain: "ReactNativeFilesystem",
        code: 400,
        userInfo: [NSLocalizedDescriptionKey: "Only http and https URLs are supported: \(urlString)"]
      )
    }

    return url
  }

  private func ensurePhotoLibraryAccess(level: PHAccessLevel) async throws {
    let currentStatus = PHPhotoLibrary.authorizationStatus(for: level)
    if currentStatus == .authorized || currentStatus == .limited {
      return
    }

    let status = await withCheckedContinuation { continuation in
      PHPhotoLibrary.requestAuthorization(for: level) { authorizationStatus in
        continuation.resume(returning: authorizationStatus)
      }
    }
    if status == .authorized || status == .limited {
      return
    }

    throw NSError(
      domain: "ReactNativeFilesystem",
      code: 403,
      userInfo: [
        NSLocalizedDescriptionKey:
          level == .addOnly
            ? "Photo library add permission was denied. Add NSPhotoLibraryAddUsageDescription and allow access before calling saveImageToLibrary()."
            : "Photo library read permission was denied. Add NSPhotoLibraryUsageDescription and allow access before calling getImages() or deleteImageFromLibrary()."
      ]
    )
  }

  private func resolveLocalFileURL(from path: String) throws -> URL {
    if path.hasPrefix("file://"), let url = URL(string: path), url.isFileURL {
      return url
    }

    let url = URL(fileURLWithPath: path)
    if url.isFileURL {
      return url
    }

    throw NSError(
      domain: "ReactNativeFilesystem",
      code: 400,
      userInfo: [NSLocalizedDescriptionKey: "Only local file paths are supported for saveImageToLibrary on iOS."]
    )
  }

  private func createPhotoAsset(from fileURL: URL, filename: String?) async throws -> String {
    try await withCheckedThrowingContinuation { continuation in
      var placeholderIdentifier: String?

      PHPhotoLibrary.shared().performChanges {
        let creationRequest = PHAssetCreationRequest.forAsset()
        let resourceOptions = PHAssetResourceCreationOptions()
        if let filename, !filename.isEmpty {
          resourceOptions.originalFilename = filename
        }

        creationRequest.addResource(with: .photo, fileURL: fileURL, options: resourceOptions)
        placeholderIdentifier = creationRequest.placeholderForCreatedAsset?.localIdentifier
      } completionHandler: { success, error in
        if let error {
          continuation.resume(throwing: error)
          return
        }

        guard success, let placeholderIdentifier else {
          continuation.resume(
            throwing: NSError(
              domain: "ReactNativeFilesystem",
              code: 500,
              userInfo: [NSLocalizedDescriptionKey: "Unable to save the image to the photo library."]
            )
          )
          return
        }

        continuation.resume(returning: placeholderIdentifier)
      }
    }
  }

  private func resolvePhotoAssetLocalIdentifier(from options: [String: Any]) throws -> String {
    guard let asset = options["asset"] as? [String: Any] else {
      throw NSError(
        domain: "ReactNativeFilesystem",
        code: 400,
        userInfo: [NSLocalizedDescriptionKey: "deleteImageFromLibrary requires an asset option."]
      )
    }

    if let localIdentifier = asset["id"] as? String, !localIdentifier.isEmpty {
      return localIdentifier
    }

    if let uri = asset["uri"] as? String, uri.hasPrefix("ph://") {
      let localIdentifier = String(uri.dropFirst("ph://".count))
      if !localIdentifier.isEmpty {
        return localIdentifier
      }
    }

    throw NSError(
      domain: "ReactNativeFilesystem",
      code: 400,
      userInfo: [NSLocalizedDescriptionKey: "deleteImageFromLibrary requires a valid photo library asset id."]
    )
  }

  private func fetchPhotoAsset(localIdentifier: String) throws -> PHAsset {
    let assets = PHAsset.fetchAssets(withLocalIdentifiers: [localIdentifier], options: nil)
    guard let asset = assets.firstObject else {
      throw NSError(
        domain: "ReactNativeFilesystem",
        code: 404,
        userInfo: [NSLocalizedDescriptionKey: "Saved photo asset could not be loaded from the library."]
      )
    }

    return asset
  }

  private func deletePhotoAsset(localIdentifier: String) async throws {
    let assets = PHAsset.fetchAssets(withLocalIdentifiers: [localIdentifier], options: nil)
    guard assets.count > 0 else {
      return
    }

    try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<Void, Error>) in
      PHPhotoLibrary.shared().performChanges {
        PHAssetChangeRequest.deleteAssets(assets)
      } completionHandler: { success, error in
        if let error {
          continuation.resume(throwing: error)
          return
        }

        guard success else {
          continuation.resume(
            throwing: NSError(
              domain: "ReactNativeFilesystem",
              code: 500,
              userInfo: [NSLocalizedDescriptionKey: "Unable to delete the image from the photo library."]
            )
          )
          return
        }

        continuation.resume(returning: ())
      }
    }
  }

  private func serializeImageAsset(_ asset: PHAsset) -> [String: Any?] {
    let resources = PHAssetResource.assetResources(for: asset)
    let primaryResource = resources.first
    let mimeType: String?
    if let uniformTypeIdentifier = primaryResource?.uniformTypeIdentifier {
      mimeType = UTType(uniformTypeIdentifier)?.preferredMIMEType
    } else {
      mimeType = nil
    }
    let previewUri = createPreviewImageURL(for: asset)?.absoluteString

    return [
      "id": asset.localIdentifier,
      "uri": "ph://\(asset.localIdentifier)",
      "previewUri": previewUri,
      "filename": primaryResource?.originalFilename,
      "width": asset.pixelWidth > 0 ? asset.pixelWidth : nil,
      "height": asset.pixelHeight > 0 ? asset.pixelHeight : nil,
      "mimeType": mimeType,
      "size": nil,
      "creationTime": asset.creationDate?.timeIntervalSince1970,
      "modificationTime": asset.modificationDate?.timeIntervalSince1970
    ]
  }

  private func createPreviewImageURL(for asset: PHAsset) -> URL? {
    let previewsDirectory = FileManager.default.temporaryDirectory
      .appendingPathComponent("react-native-filesystem-media-previews", isDirectory: true)

    do {
      try FileManager.default.createDirectory(
        at: previewsDirectory,
        withIntermediateDirectories: true,
        attributes: nil
      )
    } catch {
      return nil
    }

    let sanitizedIdentifier = asset.localIdentifier.replacingOccurrences(of: "/", with: "_")
    let fileURL = previewsDirectory.appendingPathComponent("\(sanitizedIdentifier).jpg")
    if FileManager.default.fileExists(atPath: fileURL.path) {
      return fileURL
    }

    let requestOptions = PHImageRequestOptions()
    requestOptions.deliveryMode = .highQualityFormat
    requestOptions.isNetworkAccessAllowed = true
    requestOptions.isSynchronous = true
    requestOptions.resizeMode = .exact

    var renderedImage: UIImage?
    PHImageManager.default().requestImage(
      for: asset,
      targetSize: CGSize(width: 600, height: 600),
      contentMode: .aspectFill,
      options: requestOptions
    ) { image, _ in
      renderedImage = image
    }

    guard let renderedImage, let jpegData = renderedImage.jpegData(compressionQuality: 0.85) else {
      return nil
    }

    do {
      try jpegData.write(to: fileURL, options: .atomic)
      return fileURL
    } catch {
      return nil
    }
  }

  private func createTemporaryExportFile(named filename: String, contents: String, mimeType: String?) throws -> URL {
    let exportDirectory = FileManager.default.temporaryDirectory
      .appendingPathComponent("react-native-filesystem-exports", isDirectory: true)

    try FileManager.default.createDirectory(
      at: exportDirectory,
      withIntermediateDirectories: true,
      attributes: nil
    )

    let resolvedFilename = resolveFilename(filename, explicitMimeType: mimeType)
    let temporaryURL = exportDirectory.appendingPathComponent(resolvedFilename, isDirectory: false)

    if FileManager.default.fileExists(atPath: temporaryURL.path) {
      try FileManager.default.removeItem(at: temporaryURL)
    }

    try contents.write(to: temporaryURL, atomically: true, encoding: .utf8)

    return temporaryURL
  }

  private func resolveDownloadDestinationURL(
    from destinationURL: URL,
    response: HTTPURLResponse,
    explicitMimeType: String?
  ) -> URL {
    guard destinationURL.pathExtension.isEmpty else {
      return destinationURL
    }

    let inferredExtension =
      preferredFilenameExtension(for: explicitMimeType)
      ?? URL(fileURLWithPath: response.suggestedFilename ?? "").pathExtension.nilIfEmpty
      ?? preferredFilenameExtension(for: response.mimeType)

    guard let inferredExtension else {
      return destinationURL
    }

    return destinationURL.appendingPathExtension(inferredExtension)
  }

  private func resolveFilename(_ filename: String, explicitMimeType: String?) -> String {
    guard URL(fileURLWithPath: filename).pathExtension.isEmpty,
          let inferredExtension = preferredFilenameExtension(for: explicitMimeType) else {
      return filename
    }

    return "\(filename).\(inferredExtension)"
  }

  private func preferredFilenameExtension(for mimeType: String?) -> String? {
    guard let contentType = contentType(for: mimeType) else {
      return nil
    }

    return contentType.preferredFilenameExtension
  }

  private func contentType(for mimeType: String?) -> UTType? {
    guard let rawMimeType = mimeType?
      .split(separator: ";", maxSplits: 1, omittingEmptySubsequences: true)
      .first?
      .trimmingCharacters(in: .whitespacesAndNewlines),
      !rawMimeType.isEmpty else {
      return nil
    }

    return UTType(mimeType: rawMimeType)
  }

  private func emitDownloadProgress(
    url: String,
    destinationPath: String,
    progressId: String?,
    bytesWritten: Int64,
    contentLength: Int64
  ) {
    let normalizedContentLength = contentLength >= 0 ? contentLength : nil
    let progress: Double?
    if let normalizedContentLength, normalizedContentLength > 0 {
      progress = Double(bytesWritten) / Double(normalizedContentLength)
    } else {
      progress = nil
    }

    sendEvent("downloadProgress", [
      "bytesWritten": bytesWritten,
      "contentLength": normalizedContentLength,
      "destinationPath": destinationPath,
      "progress": progress,
      "progressId": progressId,
      "url": url
    ])
  }

  private func setActiveDownloadDelegate(_ delegate: IOSDownloadTaskDelegate?, for taskIdentifier: Int) {
    activeDownloadDelegatesQueue.sync {
      activeDownloadDelegates[taskIdentifier] = delegate
    }
  }
}

private extension String {
  var nilIfEmpty: String? {
    isEmpty ? nil : self
  }
}

private final class IOSDownloadTaskDelegate: NSObject, URLSessionDownloadDelegate {
  var session: URLSession?
  var taskIdentifier: Int = 0

  private let progressIntervalMs: Int
  private let onProgress: (Int64, Int64, HTTPURLResponse?) -> Void
  private let onComplete: (Result<(URL, HTTPURLResponse), Error>, Int) -> Void
  private var didComplete = false
  private var lastProgressEventAt = Date.distantPast
  private var temporaryURL: URL?

  init(
    progressIntervalMs: Int,
    onProgress: @escaping (Int64, Int64, HTTPURLResponse?) -> Void,
    onComplete: @escaping (Result<(URL, HTTPURLResponse), Error>, Int) -> Void
  ) {
    self.progressIntervalMs = progressIntervalMs
    self.onProgress = onProgress
    self.onComplete = onComplete
  }

  func urlSession(
    _ session: URLSession,
    downloadTask: URLSessionDownloadTask,
    didWriteData bytesWritten: Int64,
    totalBytesWritten: Int64,
    totalBytesExpectedToWrite: Int64
  ) {
    let shouldEmitProgress =
      progressIntervalMs <= 0 ||
      Date().timeIntervalSince(lastProgressEventAt) * 1000 >= Double(progressIntervalMs) ||
      (totalBytesExpectedToWrite > 0 && totalBytesWritten >= totalBytesExpectedToWrite)

    guard shouldEmitProgress else {
      return
    }

    lastProgressEventAt = Date()
    onProgress(totalBytesWritten, totalBytesExpectedToWrite, downloadTask.response as? HTTPURLResponse)
  }

  func urlSession(
    _ session: URLSession,
    downloadTask: URLSessionDownloadTask,
    didFinishDownloadingTo location: URL
  ) {
    temporaryURL = location
  }

  func urlSession(_ session: URLSession, task: URLSessionTask, didCompleteWithError error: Error?) {
    guard !didComplete else {
      return
    }

    didComplete = true
    session.finishTasksAndInvalidate()

    if let error {
      onComplete(.failure(error), taskIdentifier)
      return
    }

    guard let httpResponse = task.response as? HTTPURLResponse else {
      onComplete(
        .failure(
          NSError(
            domain: "ReactNativeFilesystem",
            code: 500,
            userInfo: [NSLocalizedDescriptionKey: "Expected an HTTP response for URLSession download."]
          )
        ),
        taskIdentifier
      )
      return
    }

    guard let temporaryURL else {
      onComplete(
        .failure(
          NSError(
            domain: "ReactNativeFilesystem",
            code: 500,
            userInfo: [NSLocalizedDescriptionKey: "Download completed without a temporary file."]
          )
        ),
        taskIdentifier
      )
      return
    }

    onComplete(.success((temporaryURL, httpResponse)), taskIdentifier)
  }
}

private final class IOSFileExportHandler: NSObject, UIDocumentPickerDelegate, UIAdaptivePresentationControllerDelegate {
  private weak var module: ReactNativeFilesystemModule?
  private var activePromise: Promise?
  private var temporaryURL: URL?

  init(module: ReactNativeFilesystemModule) {
    self.module = module
  }

  func presentDocumentPicker(for temporaryURL: URL, promise: Promise) {
    guard activePromise == nil else {
      cleanupTemporaryFile(at: temporaryURL)
      promise.reject("ERR_EXPORT_IN_PROGRESS", "Another file export is already in progress.")
      return
    }

    guard let currentViewController = module?.appContext?.utilities?.currentViewController() else {
      cleanupTemporaryFile(at: temporaryURL)
      promise.reject("ERR_MISSING_VIEW_CONTROLLER", "Unable to present the iOS Files picker.")
      return
    }

    let picker = UIDocumentPickerViewController(forExporting: [temporaryURL], asCopy: true)
    picker.delegate = self
    picker.presentationController?.delegate = self

    if UIDevice.current.userInterfaceIdiom == .pad {
      let viewFrame = currentViewController.view.frame
      picker.popoverPresentationController?.sourceRect = CGRect(
        x: viewFrame.midX,
        y: viewFrame.maxY,
        width: 0,
        height: 0
      )
      picker.popoverPresentationController?.sourceView = currentViewController.view
      picker.modalPresentationStyle = .pageSheet
    }

    activePromise = promise
    self.temporaryURL = temporaryURL
    currentViewController.present(picker, animated: true)
  }

  func documentPicker(_ controller: UIDocumentPickerViewController, didPickDocumentsAt urls: [URL]) {
    let promise = activePromise
    let pickedURL = urls.first
    finish()

    if let pickedURL {
      promise?.resolve(pickedURL.path)
    } else {
      promise?.reject("ERR_EXPORT_CANCELLED", "File export was cancelled.")
    }
  }

  func documentPickerWasCancelled(_ controller: UIDocumentPickerViewController) {
    let promise = activePromise
    finish()
    promise?.reject("ERR_EXPORT_CANCELLED", "File export was cancelled.")
  }

  func presentationControllerDidDismiss(_ presentationController: UIPresentationController) {
    let promise = activePromise
    finish()
    promise?.reject("ERR_EXPORT_CANCELLED", "File export was cancelled.")
  }

  private func finish() {
    cleanupTemporaryFile(at: temporaryURL)
    temporaryURL = nil
    activePromise = nil
  }

  private func cleanupTemporaryFile(at url: URL?) {
    guard let url else {
      return
    }

    try? FileManager.default.removeItem(at: url)
  }
}
