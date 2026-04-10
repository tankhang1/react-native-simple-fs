import ExpoModulesCore
import Foundation
import UIKit
import UniformTypeIdentifiers

public class ReactNativeFilesystemModule: Module {
  private lazy var fileExportHandler = IOSFileExportHandler(module: self)

  // Each module class must implement the definition function. The definition consists of components
  // that describes the module's functionality and behavior.
  // See https://docs.expo.dev/modules/module-api for more details about available components.
  public func definition() -> ModuleDefinition {
    // Sets the name of the module that JavaScript code will use to refer to the module. Takes a string as an argument.
    // Can be inferred from module's class name, but it's recommended to set it explicitly for clarity.
    // The module will be accessible from `requireNativeModule('ReactNativeFilesystem')` in JavaScript.
    Name("ReactNativeFilesystem")

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

    AsyncFunction("downloadFile") { (urlString: String, destinationPath: String, options: [String: Any]?) async throws -> [String: Any] in
      let sourceURL = try self.createDownloadSourceURL(from: urlString)
      let (temporaryURL, response) = try await URLSession.shared.download(from: sourceURL)

      guard let httpResponse = response as? HTTPURLResponse else {
        throw NSError(
          domain: "ReactNativeFilesystem",
          code: 500,
          userInfo: [NSLocalizedDescriptionKey: "Expected an HTTP response for URL: \(urlString)"]
        )
      }

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
}

private extension String {
  var nilIfEmpty: String? {
    isEmpty ? nil : self
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
