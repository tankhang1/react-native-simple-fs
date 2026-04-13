package expo.modules.filesystem

import android.app.Activity
import android.app.RecoverableSecurityException
import android.content.ContentUris
import android.content.Context
import android.content.ContentValues
import android.content.Intent
import android.content.IntentSender
import android.media.MediaScannerConnection
import android.net.Uri
import android.os.Build
import android.os.Environment
import android.provider.MediaStore
import android.webkit.MimeTypeMap
import androidx.activity.result.IntentSenderRequest
import androidx.activity.result.contract.ActivityResultContracts.StartIntentSenderForResult
import expo.modules.interfaces.filesystem.Permission
import expo.modules.kotlin.activityresult.AppContextActivityResultContract
import expo.modules.kotlin.activityresult.AppContextActivityResultLauncher
import expo.modules.kotlin.functions.Coroutine
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.exception.Exceptions
import java.io.File
import java.io.FileNotFoundException
import java.io.FileOutputStream
import java.io.IOException
import java.io.OutputStream
import java.net.HttpURLConnection
import java.net.URL
import java.util.EnumSet
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit

class ReactNativeFilesystemModule : Module() {
  private data class DownloadTarget(
    val path: String,
    val outputStream: OutputStream,
    val cleanup: () -> Unit
  )

  private var deleteImageFromLibraryLauncher: AppContextActivityResultLauncher<String, Boolean>? = null
  private var pendingDeleteIntentSender: IntentSender? = null

  private val context
    get() = appContext.reactContext ?: throw Exceptions.AppContextLost()

  // Each module class must implement the definition function. The definition consists of components
  // that describes the module's functionality and behavior.
  // See https://docs.expo.dev/modules/module-api for more details about available components.
  override fun definition() = ModuleDefinition {
    // Sets the name of the module that JavaScript code will use to refer to the module. Takes a string as an argument.
    // Can be inferred from module's class name, but it's recommended to set it explicitly for clarity.
    // The module will be accessible from `requireNativeModule('ReactNativeFilesystem')` in JavaScript.
    Name("ReactNativeFilesystem")

    Events("downloadProgress")

    RegisterActivityContracts {
      deleteImageFromLibraryLauncher = registerForActivityResult(
        object : AppContextActivityResultContract<String, Boolean> {
          override fun createIntent(context: Context, input: String): Intent {
            val intentSender = pendingDeleteIntentSender
              ?: throw IllegalStateException("Missing pending delete intent sender for image asset: $input")
            val request = IntentSenderRequest.Builder(intentSender).build()

            return Intent(StartIntentSenderForResult.ACTION_INTENT_SENDER_REQUEST)
              .putExtra(StartIntentSenderForResult.EXTRA_INTENT_SENDER_REQUEST, request)
          }

          override fun parseResult(input: String, resultCode: Int, intent: Intent?): Boolean {
            return resultCode == Activity.RESULT_OK
          }
        }
      )
    }

    OnDestroy {
      pendingDeleteIntentSender = null
      deleteImageFromLibraryLauncher = null
    }

    AsyncFunction("getDocumentsDirectory") {
      appContext.persistentFilesDirectory.absolutePath
    }

    AsyncFunction("exists") { path: String ->
      if (isContentUri(path)) {
        return@AsyncFunction contentUriExists(path)
      }

      File(path).exists()
    }

    AsyncFunction("readFile") { path: String ->
      if (isContentUri(path)) {
        val uri = Uri.parse(path)
        val inputStream = context.contentResolver.openInputStream(uri)
          ?: throw FileNotFoundException("Unable to open content URI: $path")

        return@AsyncFunction inputStream.bufferedReader(Charsets.UTF_8).use { it.readText() }
      }

      validateFileAccess(path, Permission.READ)

      val file = File(path)
      if (!file.exists()) {
        throw IOException("File does not exist at path: $path")
      }
      file.readText(Charsets.UTF_8)
    }

    AsyncFunction("writeFile") { path: String, contents: String ->
      validateFileAccess(path, Permission.WRITE)

      val file = File(path)
      file.parentFile?.mkdirs()
      file.writeText(contents, Charsets.UTF_8)
    }

    AsyncFunction("saveImageToLibrary") { path: String, options: Map<String, Any>? ->
      saveImageToLibrary(
        path = path,
        filename = options?.get("filename") as? String,
        mimeType = options?.get("mimeType") as? String
      )
    }

    AsyncFunction("getImages") { options: Map<String, Any>? ->
      getImages((options?.get("limit") as? Number)?.toInt())
    }

    AsyncFunction("deleteImageFromLibrary") Coroutine { options: Map<String, Any?> ->
      deleteImageFromLibrary(options)
    }

    AsyncFunction("downloadFile") { url: String, destinationPath: String, options: Map<String, Any>? ->
      val saveToDownloads = options?.get("saveToDownloads") as? Boolean ?: false
      if (!saveToDownloads && !isContentUri(destinationPath)) {
        validateFileAccess(destinationPath, Permission.WRITE)
      }

      downloadFile(
        url = url,
        destinationPath = destinationPath,
        mimeType = options?.get("mimeType") as? String,
        saveToDownloads = saveToDownloads,
        progressId = options?.get("progressId") as? String,
        onProgressIntervalMs = (options?.get("onProgressIntervalMs") as? Number)?.toLong() ?: 0L
      )
    }

    AsyncFunction("writeFileToDownloads") { filename: String, contents: String, mimeType: String? ->
      writeFileToDownloads(filename, contents, mimeType ?: "text/plain")
    }

    AsyncFunction("deleteFile") { path: String ->
      if (isContentUri(path)) {
        val deletedRows = context.contentResolver.delete(Uri.parse(path), null, null)
        return@AsyncFunction if (deletedRows == 0) {
          throw IOException("Unable to delete content URI: $path")
        } else {
          Unit
        }
      }

      validateFileAccess(path, Permission.WRITE)

      val file = File(path)
      if (!file.exists()) {
        return@AsyncFunction
      }

      if (!deleteRecursively(file)) {
        throw IOException("Unable to delete path: $path")
      }
    }

    AsyncFunction("mkdir") { path: String ->
      validateFileAccess(path, Permission.WRITE)

      val directory = File(path)
      if (directory.exists()) {
        if (!directory.isDirectory) {
          throw IOException("Path already exists and is not a directory: $path")
        }
      } else if (!directory.mkdirs()) {
        throw IOException("Unable to create directory: $path")
      }
    }

    AsyncFunction("readdir") { path: String ->
      validateFileAccess(path, Permission.READ)

      val directory = File(path)
      if (!directory.exists()) {
        throw IOException("Directory does not exist at path: $path")
      }
      if (!directory.isDirectory) {
        throw IOException("Path is not a directory: $path")
      }

      directory.list()?.toList() ?: emptyList()
    }

    AsyncFunction("stat") { path: String ->
      if (isContentUri(path)) {
        return@AsyncFunction statContentUri(path)
      }

      val file = File(path)
      if (!file.exists()) {
        return@AsyncFunction mapOf(
          "path" to path,
          "exists" to false,
          "isFile" to false,
          "isDirectory" to false,
          "size" to 0L,
          "modificationTime" to null
        )
      }

      mapOf(
        "path" to path,
        "exists" to true,
        "isFile" to file.isFile,
        "isDirectory" to file.isDirectory,
        "size" to file.length(),
        "modificationTime" to file.lastModified().toDouble() / 1000.0
      )
    }

    AsyncFunction("move") { from: String, to: String ->
      validateFileAccess(from, Permission.WRITE)
      validateFileAccess(to, Permission.WRITE)

      val source = File(from)
      val destination = File(to)

      if (!source.exists()) {
        throw IOException("Source path does not exist: $from")
      }

      destination.parentFile?.mkdirs()
      if (destination.exists() && !deleteRecursively(destination)) {
        throw IOException("Unable to replace existing destination: $to")
      }

      if (!source.renameTo(destination)) {
        copyFileOrDirectory(source, destination)
        if (!deleteRecursively(source)) {
          throw IOException("Move completed, but cleanup failed for source: $from")
        }
      }
    }

    AsyncFunction("copy") { from: String, to: String ->
      validateFileAccess(from, Permission.READ)
      validateFileAccess(to, Permission.WRITE)

      val source = File(from)
      val destination = File(to)

      if (!source.exists()) {
        throw IOException("Source path does not exist: $from")
      }

      copyFileOrDirectory(source, destination)
    }

    // Enables the module to be used as a native view. Definition components that are accepted as part of
    // the view definition: Prop, Events.
    View(ReactNativeFilesystemView::class) {
      // Defines a setter for the `url` prop.
      Prop("url") { view: ReactNativeFilesystemView, url: URL ->
        view.webView.loadUrl(url.toString())
      }
      // Defines an event that the view can send to JavaScript.
      Events("onLoad")
    }
  }

  private fun validateFileAccess(path: String, permission: Permission) {
    if (isContentUri(path)) {
      return
    }

    val permissions = appContext.filePermission?.getPathPermissions(context, path)
      ?: EnumSet.noneOf(Permission::class.java)
    if (permissions.contains(permission)) {
      return
    }

    val permissionName = if (permission == Permission.READ) "read" else "write"
    throw IOException(
      "No $permissionName access for path: $path. " +
        "Use getDocumentsDirectory() for app-private files or writeFileToDownloads() for Android Downloads."
    )
  }

  private fun downloadFile(
    url: String,
    destinationPath: String,
    mimeType: String?,
    saveToDownloads: Boolean,
    progressId: String?,
    onProgressIntervalMs: Long
  ): Map<String, Any> {
    val parsedUrl = try {
      URL(url)
    } catch (error: Exception) {
      throw IOException("Invalid URL: $url", error)
    }

    val protocol = parsedUrl.protocol?.lowercase()
    if (protocol != "https" && protocol != "http") {
      throw IOException("Only http and https URLs are supported: $url")
    }

    val connection = (parsedUrl.openConnection() as? HttpURLConnection)
      ?: throw IOException("Unable to open HTTP connection for URL: $url")

    connection.instanceFollowRedirects = true
    connection.connectTimeout = 15000
    connection.readTimeout = 30000
    var downloadTarget: DownloadTarget? = null

    try {
      connection.connect()

      val statusCode = connection.responseCode
      if (statusCode !in 200..299) {
        throw IOException("Download failed with HTTP $statusCode for URL: $url")
      }

      val resolvedDestinationPath = resolveDownloadTargetPath(
        destinationPath = destinationPath,
        explicitMimeType = mimeType,
        suggestedFilename = connection.getHeaderField("Content-Disposition"),
        responseMimeType = connection.contentType,
        saveToDownloads = saveToDownloads
      )
      val contentLength = connection.contentLengthLong.takeIf { it >= 0L }
      downloadTarget = openDownloadTarget(
        resolvedDestinationPath = resolvedDestinationPath,
        mimeType = mimeType ?: connection.contentType,
        saveToDownloads = saveToDownloads
      )

      var bytesWritten = 0L
      var lastProgressEventAt = 0L
      connection.inputStream.use { inputStream ->
        downloadTarget.outputStream.use { outputStream ->
          val buffer = ByteArray(DEFAULT_BUFFER_SIZE)
          while (true) {
            val bytesRead = inputStream.read(buffer)
            if (bytesRead < 0) {
              break
            }

            outputStream.write(buffer, 0, bytesRead)
            bytesWritten += bytesRead.toLong()

            val now = System.currentTimeMillis()
            val shouldEmitProgress =
              onProgressIntervalMs <= 0L ||
                now - lastProgressEventAt >= onProgressIntervalMs ||
                (contentLength != null && bytesWritten >= contentLength)

            if (shouldEmitProgress) {
              emitDownloadProgress(
                url = url,
                destinationPath = downloadTarget.path,
                progressId = progressId,
                bytesWritten = bytesWritten,
                contentLength = contentLength
              )
              lastProgressEventAt = now
            }
          }
          outputStream.flush()
        }
      }

      if (bytesWritten == 0L || contentLength == null || bytesWritten < contentLength) {
        emitDownloadProgress(
          url = url,
          destinationPath = downloadTarget.path,
          progressId = progressId,
          bytesWritten = bytesWritten,
          contentLength = contentLength
        )
      }

      return mapOf(
        "path" to downloadTarget.path,
        "bytesWritten" to bytesWritten,
        "statusCode" to statusCode
      )
    } catch (error: Exception) {
      downloadTarget?.cleanup?.invoke()
      throw error
    } finally {
      connection.disconnect()
    }
  }

  private fun resolveDownloadTargetPath(
    destinationPath: String,
    explicitMimeType: String?,
    suggestedFilename: String?,
    responseMimeType: String?,
    saveToDownloads: Boolean
  ): String {
    if (saveToDownloads) {
      return resolveDownloadFilename(
        destinationPath = destinationPath,
        explicitMimeType = explicitMimeType,
        suggestedFilename = suggestedFilename,
        responseMimeType = responseMimeType
      )
    }

    if (isContentUri(destinationPath)) {
      return destinationPath
    }

    val destinationFile = File(destinationPath)
    if (destinationFile.extension.isNotEmpty()) {
      return destinationFile.absolutePath
    }

    val inferredExtension = extensionFromMimeType(explicitMimeType)
      ?: extensionFromContentDisposition(suggestedFilename)
      ?: extensionFromMimeType(responseMimeType)

    if (inferredExtension.isNullOrEmpty()) {
      return destinationFile.absolutePath
    }

    return File(destinationFile.parentFile, "${destinationFile.name}.$inferredExtension").absolutePath
  }

  private fun resolveDownloadFilename(
    destinationPath: String,
    explicitMimeType: String?,
    suggestedFilename: String?,
    responseMimeType: String?
  ): String {
    val rawFilename = File(destinationPath).name.ifEmpty {
      extractFilenameFromContentDisposition(suggestedFilename)
        ?: "download"
    }

    if (rawFilename.substringAfterLast('.', "").isNotEmpty()) {
      return rawFilename
    }

    val inferredExtension = extensionFromMimeType(explicitMimeType)
      ?: extensionFromContentDisposition(suggestedFilename)
      ?: extensionFromMimeType(responseMimeType)

    return if (inferredExtension.isNullOrEmpty()) {
      rawFilename
    } else {
      "$rawFilename.$inferredExtension"
    }
  }

  private fun openDownloadTarget(
    resolvedDestinationPath: String,
    mimeType: String?,
    saveToDownloads: Boolean
  ): DownloadTarget {
    if (saveToDownloads) {
      return openDownloadsTarget(resolvedDestinationPath, mimeType)
    }

    if (isContentUri(resolvedDestinationPath)) {
      val uri = Uri.parse(resolvedDestinationPath)
      val outputStream = context.contentResolver.openOutputStream(uri, "w")
        ?: throw IOException("Unable to open content URI for writing: $resolvedDestinationPath")

      return DownloadTarget(
        path = resolvedDestinationPath,
        outputStream = outputStream,
        cleanup = { context.contentResolver.delete(uri, null, null) }
      )
    }

    val destinationFile = File(resolvedDestinationPath)
    destinationFile.parentFile?.mkdirs()
    return DownloadTarget(
      path = destinationFile.absolutePath,
      outputStream = FileOutputStream(destinationFile),
      cleanup = {
        if (destinationFile.exists()) {
          destinationFile.delete()
        }
      }
    )
  }

  private fun openDownloadsTarget(filename: String, mimeType: String?): DownloadTarget {
    val resolvedMimeType = sanitizeMimeType(mimeType) ?: "application/octet-stream"

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
      val values = ContentValues().apply {
        put(MediaStore.MediaColumns.DISPLAY_NAME, filename)
        put(MediaStore.MediaColumns.MIME_TYPE, resolvedMimeType)
        put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS)
      }

      val uri = context.contentResolver.insert(
        MediaStore.Downloads.EXTERNAL_CONTENT_URI,
        values
      ) ?: throw IOException("Unable to create a Downloads entry for $filename")

      val outputStream = context.contentResolver.openOutputStream(uri, "w")
        ?: run {
          context.contentResolver.delete(uri, null, null)
          throw IOException("Unable to open a Downloads output stream for $filename")
        }

      return DownloadTarget(
        path = uri.toString(),
        outputStream = outputStream,
        cleanup = { context.contentResolver.delete(uri, null, null) }
      )
    }

    ensureLegacyExternalStoragePermission(EnumSet.of(Permission.WRITE))
    @Suppress("DEPRECATION")
    val downloadsDirectory = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS)
    val file = File(downloadsDirectory, filename)
    file.parentFile?.mkdirs()
    return DownloadTarget(
      path = file.absolutePath,
      outputStream = FileOutputStream(file),
      cleanup = {
        if (file.exists()) {
          file.delete()
        }
      }
    )
  }

  private fun emitDownloadProgress(
    url: String,
    destinationPath: String,
    progressId: String?,
    bytesWritten: Long,
    contentLength: Long?
  ) {
    val progress = if (contentLength != null && contentLength > 0L) {
      bytesWritten.toDouble() / contentLength.toDouble()
    } else {
      null
    }

    sendEvent(
      "downloadProgress",
      mapOf(
        "bytesWritten" to bytesWritten,
        "contentLength" to contentLength,
        "destinationPath" to destinationPath,
        "progress" to progress,
        "progressId" to progressId,
        "url" to url
      )
    )
  }

  private fun extensionFromContentDisposition(contentDisposition: String?): String? {
    val filename = extractFilenameFromContentDisposition(contentDisposition) ?: return null
    val extension = filename.substringAfterLast('.', "")
    return extension.ifEmpty { null }
  }

  private fun extractFilenameFromContentDisposition(contentDisposition: String?): String? {
    return contentDisposition
      ?.split(';')
      ?.map { it.trim() }
      ?.firstOrNull { it.startsWith("filename=", ignoreCase = true) }
      ?.substringAfter('=')
      ?.trim('"')
  }

  private fun extensionFromMimeType(mimeType: String?): String? {
    return sanitizeMimeType(mimeType)?.let { MimeTypeMap.getSingleton().getExtensionFromMimeType(it) }
  }

  private fun sanitizeMimeType(mimeType: String?): String? {
    return mimeType?.substringBefore(';')?.trim()?.lowercase()?.ifEmpty { null }
  }

  private fun isContentUri(path: String): Boolean {
    return path.startsWith("content://")
  }

  private fun contentUriExists(path: String): Boolean {
    return try {
      context.contentResolver.openFileDescriptor(Uri.parse(path), "r")?.use { true } ?: false
    } catch (_: Exception) {
      false
    }
  }

  private fun statContentUri(path: String): Map<String, Any?> {
    val uri = Uri.parse(path)
    val projection = arrayOf(
      MediaStore.MediaColumns.DISPLAY_NAME,
      MediaStore.MediaColumns.SIZE,
      MediaStore.MediaColumns.MIME_TYPE,
      MediaStore.MediaColumns.DATE_MODIFIED
    )

    context.contentResolver.query(uri, projection, null, null, null)?.use { cursor ->
      if (cursor.moveToFirst()) {
        val size = cursor.getColumnIndex(MediaStore.MediaColumns.SIZE)
          .takeIf { it >= 0 }
          ?.let(cursor::getLong)
          ?: 0L
        val mimeType = cursor.getColumnIndex(MediaStore.MediaColumns.MIME_TYPE)
          .takeIf { it >= 0 }
          ?.let(cursor::getString)
          .orEmpty()
        val modificationTime = cursor.getColumnIndex(MediaStore.MediaColumns.DATE_MODIFIED)
          .takeIf { it >= 0 }
          ?.let(cursor::getLong)
          ?.toDouble()

        return mapOf(
          "path" to path,
          "exists" to true,
          "isFile" to !mimeType.endsWith("/"),
          "isDirectory" to false,
          "size" to size,
          "modificationTime" to modificationTime
        )
      }
    }

    return mapOf(
      "path" to path,
      "exists" to false,
      "isFile" to false,
      "isDirectory" to false,
      "size" to 0L,
      "modificationTime" to null
    )
  }

  private fun writeFileToDownloads(filename: String, contents: String, mimeType: String): String {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
      val values = ContentValues().apply {
        put(MediaStore.MediaColumns.DISPLAY_NAME, filename)
        put(MediaStore.MediaColumns.MIME_TYPE, mimeType)
        put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS)
      }

      val uri = context.contentResolver.insert(
        MediaStore.Downloads.EXTERNAL_CONTENT_URI,
        values
      ) ?: throw IOException("Unable to create a Downloads entry for $filename")

      try {
        context.contentResolver.openOutputStream(uri, "w")?.bufferedWriter(Charsets.UTF_8).use { writer ->
          if (writer == null) {
            throw IOException("Unable to open a Downloads output stream for $filename")
          }
          writer.write(contents)
        }
      } catch (error: Exception) {
        context.contentResolver.delete(uri, null, null)
        throw error
      }

      return uri.toString()
    }

    ensureLegacyExternalStoragePermission(EnumSet.of(Permission.WRITE))
    @Suppress("DEPRECATION")
    val downloadsDirectory = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS)
    val file = File(downloadsDirectory, filename)
    file.parentFile?.mkdirs()
    file.writeText(contents, Charsets.UTF_8)
    return file.absolutePath
  }

  private fun saveImageToLibrary(
    path: String,
    filename: String?,
    mimeType: String?
  ): Map<String, Any?> {
    val sourceUri = path.takeIf(::isContentUri)?.let(Uri::parse)
    if (sourceUri == null) {
      validateFileAccess(path, Permission.READ)
    }

    val resolvedFilename = filename
      ?.trim()
      ?.takeIf { it.isNotEmpty() }
      ?: inferImageFilename(path, sourceUri)
      ?: "image_${System.currentTimeMillis()}"
    val resolvedMimeType = sanitizeMimeType(mimeType)
      ?: sourceUri?.let(context.contentResolver::getType)?.let(::sanitizeMimeType)
      ?: mimeTypeFromPath(path)
      ?: "image/*"

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
      val values = ContentValues().apply {
        put(MediaStore.MediaColumns.DISPLAY_NAME, resolvedFilename)
        put(MediaStore.MediaColumns.MIME_TYPE, resolvedMimeType)
        put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_PICTURES)
        put(MediaStore.MediaColumns.IS_PENDING, 1)
      }

      val uri = context.contentResolver.insert(
        MediaStore.Images.Media.EXTERNAL_CONTENT_URI,
        values
      ) ?: throw IOException("Unable to create an image library entry for $resolvedFilename")

      try {
        copyPathToUri(path, uri)
        val completionValues = ContentValues().apply {
          put(MediaStore.MediaColumns.IS_PENDING, 0)
        }
        context.contentResolver.update(uri, completionValues, null, null)
        return statImageUri(uri)
      } catch (error: Exception) {
        context.contentResolver.delete(uri, null, null)
        throw error
      }
    }

    ensureLegacyExternalStoragePermission(EnumSet.of(Permission.WRITE))
    @Suppress("DEPRECATION")
    val picturesDirectory = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_PICTURES)
    val destinationFile = File(picturesDirectory, resolvedFilename)
    destinationFile.parentFile?.mkdirs()

    try {
      copyPathToFile(path, destinationFile)
      val scannedUri = scanLegacyMediaFile(destinationFile, resolvedMimeType)
      return if (scannedUri != null) {
        statImageUri(scannedUri)
      } else {
        mapOf(
          "id" to destinationFile.absolutePath,
          "uri" to destinationFile.absolutePath,
          "filename" to destinationFile.name,
          "width" to null,
          "height" to null,
          "mimeType" to resolvedMimeType,
          "size" to destinationFile.length(),
          "creationTime" to (destinationFile.lastModified().toDouble() / 1000.0),
          "modificationTime" to (destinationFile.lastModified().toDouble() / 1000.0)
        )
      }
    } catch (error: Exception) {
      if (destinationFile.exists()) {
        destinationFile.delete()
      }
      throw error
    }
  }

  private fun getImages(limit: Int?): List<Map<String, Any?>> {
    ensureImageReadPermission()

    val projection = arrayOf(
      MediaStore.Images.Media._ID,
      MediaStore.Images.Media.DISPLAY_NAME,
      MediaStore.Images.Media.MIME_TYPE,
      MediaStore.Images.Media.WIDTH,
      MediaStore.Images.Media.HEIGHT,
      MediaStore.Images.Media.SIZE,
      MediaStore.Images.Media.DATE_ADDED,
      MediaStore.Images.Media.DATE_MODIFIED
    )
    val resolvedLimit = (limit ?: 50).coerceAtLeast(1)
    val images = mutableListOf<Map<String, Any?>>()

    context.contentResolver.query(
      MediaStore.Images.Media.EXTERNAL_CONTENT_URI,
      projection,
      null,
      null,
      "${MediaStore.Images.Media.DATE_ADDED} DESC"
    )?.use { cursor ->
      while (cursor.moveToNext() && images.size < resolvedLimit) {
        images.add(imageAssetFromCursor(cursor))
      }
    }

    return images
  }

  private suspend fun deleteImageFromLibrary(options: Map<String, Any?>) {
    val asset = options["asset"] as? Map<*, *>
      ?: throw IOException("deleteImageFromLibrary requires an asset option.")
    val assetUri = (asset["uri"] as? String)?.trim().orEmpty()
    val assetId = (asset["id"] as? String)?.trim().orEmpty()

    when {
      assetUri.startsWith("content://") -> deleteMediaUri(Uri.parse(assetUri))
      assetId.isNotEmpty() -> {
        val numericId = assetId.toLongOrNull()
          ?: throw IOException("deleteImageFromLibrary requires a valid media store asset id.")
        val uri = ContentUris.withAppendedId(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, numericId)
        deleteMediaUri(uri)
      }
      assetUri.isNotEmpty() && Build.VERSION.SDK_INT < Build.VERSION_CODES.Q -> {
        deleteLegacyImagePath(assetUri)
      }
      else -> {
        throw IOException("deleteImageFromLibrary requires a valid media library asset URI or id.")
      }
    }
  }

  private suspend fun deleteMediaUri(uri: Uri) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) {
      ensureLegacyExternalStoragePermission(EnumSet.of(Permission.WRITE))
    }

    try {
      val deletedRows = context.contentResolver.delete(uri, null, null)
      if (deletedRows > 0 || !mediaUriExists(uri)) {
        return
      }

      throw IOException("Unable to delete image library asset: $uri")
    } catch (error: RecoverableSecurityException) {
      launchDeletePermissionRequest(uri, error.userAction.actionIntent.intentSender)
    } catch (error: SecurityException) {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
        val intentSender = MediaStore
          .createDeleteRequest(context.contentResolver, listOf(uri))
          .intentSender
        launchDeletePermissionRequest(uri, intentSender)
        return
      }

      throw error
    }
  }

  private suspend fun launchDeletePermissionRequest(uri: Uri, intentSender: IntentSender) {
    val launcher = deleteImageFromLibraryLauncher
      ?: throw IOException("Unable to initialize Android media delete flow.")

    pendingDeleteIntentSender = intentSender

    try {
      val confirmed = launcher.launch(uri.toString())
      if (!confirmed) {
        throw IOException("Image deletion was canceled by the user.")
      }
    } finally {
      pendingDeleteIntentSender = null
    }
  }

  private fun mediaUriExists(uri: Uri): Boolean {
    return try {
      context.contentResolver.query(uri, arrayOf(MediaStore.MediaColumns._ID), null, null, null)?.use { cursor ->
        cursor.moveToFirst()
      } ?: false
    } catch (_: SecurityException) {
      true
    } catch (_: Exception) {
      false
    }
  }

  private fun deleteLegacyImagePath(path: String) {
    ensureLegacyExternalStoragePermission(EnumSet.of(Permission.WRITE))

    val file = File(path)
    if (!file.exists()) {
      return
    }

    if (!deleteRecursively(file)) {
      throw IOException("Unable to delete image library asset at path: $path")
    }
  }

  private fun ensureLegacyExternalStoragePermission(requiredPermissions: EnumSet<Permission>) {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
      return
    }

    val legacyPermissions = mutableListOf<String>()
    if (requiredPermissions.contains(Permission.READ)) {
      legacyPermissions.add(android.Manifest.permission.READ_EXTERNAL_STORAGE)
    }
    if (requiredPermissions.contains(Permission.WRITE)) {
      legacyPermissions.add(android.Manifest.permission.WRITE_EXTERNAL_STORAGE)
    }

    if (legacyPermissions.isEmpty()) {
      return
    }

    val permissionsModule = appContext.permissions
    if (permissionsModule?.hasGrantedPermissions(*legacyPermissions.toTypedArray()) != true) {
      throw IOException(
        "Missing Android external storage permission for this operation. " +
          "Request it from the app before using legacy public storage paths."
      )
    }
  }

  private fun ensureImageReadPermission() {
    val permissionsModule = appContext.permissions

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
      if (permissionsModule?.hasGrantedPermissions(android.Manifest.permission.READ_MEDIA_IMAGES) != true) {
        throw IOException(
          "Missing Android READ_MEDIA_IMAGES permission. Request it from the app before calling getImages()."
        )
      }
      return
    }

    ensureLegacyExternalStoragePermission(EnumSet.of(Permission.READ))
  }

  private fun copyPathToUri(path: String, destinationUri: Uri) {
    openInputStreamForPath(path).use { inputStream ->
      context.contentResolver.openOutputStream(destinationUri, "w")?.use { outputStream ->
        inputStream.copyTo(outputStream)
        outputStream.flush()
      } ?: throw IOException("Unable to open destination URI for writing: $destinationUri")
    }
  }

  private fun copyPathToFile(path: String, destinationFile: File) {
    openInputStreamForPath(path).use { inputStream ->
      destinationFile.outputStream().use { outputStream ->
        inputStream.copyTo(outputStream)
        outputStream.flush()
      }
    }
  }

  private fun openInputStreamForPath(path: String) =
    if (isContentUri(path)) {
      context.contentResolver.openInputStream(Uri.parse(path))
        ?: throw IOException("Unable to open content URI for reading: $path")
    } else {
      val file = File(path)
      if (!file.exists()) {
        throw IOException("File does not exist at path: $path")
      }
      file.inputStream()
    }

  private fun inferImageFilename(path: String, sourceUri: Uri?): String? {
    val fileNameFromPath = File(path).name.takeIf { it.isNotEmpty() && it != "/" }
    if (!fileNameFromPath.isNullOrEmpty() && !isContentUri(path)) {
      return fileNameFromPath
    }

    if (sourceUri == null) {
      return null
    }

    return queryMediaString(sourceUri, MediaStore.MediaColumns.DISPLAY_NAME)
  }

  private fun mimeTypeFromPath(path: String): String? {
    val extension = File(path).extension.ifEmpty { return null }
    return MimeTypeMap.getSingleton().getMimeTypeFromExtension(extension.lowercase())
  }

  private fun scanLegacyMediaFile(file: File, mimeType: String?): Uri? {
    val latch = CountDownLatch(1)
    var scannedUri: Uri? = null
    MediaScannerConnection.scanFile(
      context,
      arrayOf(file.absolutePath),
      arrayOf(mimeType),
      { _, uri ->
        scannedUri = uri
        latch.countDown()
      }
    )
    latch.await(5, TimeUnit.SECONDS)
    return scannedUri
  }

  private fun statImageUri(uri: Uri): Map<String, Any?> {
    context.contentResolver.query(
      uri,
      arrayOf(
        MediaStore.Images.Media._ID,
        MediaStore.Images.Media.DISPLAY_NAME,
        MediaStore.Images.Media.MIME_TYPE,
        MediaStore.Images.Media.WIDTH,
        MediaStore.Images.Media.HEIGHT,
        MediaStore.Images.Media.SIZE,
        MediaStore.Images.Media.DATE_ADDED,
        MediaStore.Images.Media.DATE_MODIFIED
      ),
      null,
      null,
      null
    )?.use { cursor ->
      if (cursor.moveToFirst()) {
        return imageAssetFromCursor(cursor, uri)
      }
    }

    return mapOf(
      "id" to uri.toString(),
      "uri" to uri.toString(),
      "previewUri" to uri.toString(),
      "filename" to null,
      "width" to null,
      "height" to null,
      "mimeType" to null,
      "size" to null,
      "creationTime" to null,
      "modificationTime" to null
    )
  }

  private fun imageAssetFromCursor(cursor: android.database.Cursor, explicitUri: Uri? = null): Map<String, Any?> {
    val id = cursor.getColumnIndex(MediaStore.Images.Media._ID)
      .takeIf { it >= 0 }
      ?.let(cursor::getLong)
    val uri = explicitUri ?: id?.let { ContentUris.withAppendedId(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, it) }

    return mapOf(
      "id" to (id?.toString() ?: uri?.toString()),
      "uri" to uri?.toString(),
      "previewUri" to uri?.toString(),
      "filename" to getCursorString(cursor, MediaStore.Images.Media.DISPLAY_NAME),
      "width" to getCursorInt(cursor, MediaStore.Images.Media.WIDTH),
      "height" to getCursorInt(cursor, MediaStore.Images.Media.HEIGHT),
      "mimeType" to getCursorString(cursor, MediaStore.Images.Media.MIME_TYPE),
      "size" to getCursorLong(cursor, MediaStore.Images.Media.SIZE),
      "creationTime" to getCursorLong(cursor, MediaStore.Images.Media.DATE_ADDED)?.toDouble(),
      "modificationTime" to getCursorLong(cursor, MediaStore.Images.Media.DATE_MODIFIED)?.toDouble()
    )
  }

  private fun queryMediaString(uri: Uri, columnName: String): String? {
    context.contentResolver.query(uri, arrayOf(columnName), null, null, null)?.use { cursor ->
      if (cursor.moveToFirst()) {
        return getCursorString(cursor, columnName)
      }
    }

    return null
  }

  private fun getCursorString(cursor: android.database.Cursor, columnName: String): String? {
    val columnIndex = cursor.getColumnIndex(columnName)
    if (columnIndex < 0 || cursor.isNull(columnIndex)) {
      return null
    }
    return cursor.getString(columnIndex)
  }

  private fun getCursorInt(cursor: android.database.Cursor, columnName: String): Int? {
    val columnIndex = cursor.getColumnIndex(columnName)
    if (columnIndex < 0 || cursor.isNull(columnIndex)) {
      return null
    }
    return cursor.getInt(columnIndex)
  }

  private fun getCursorLong(cursor: android.database.Cursor, columnName: String): Long? {
    val columnIndex = cursor.getColumnIndex(columnName)
    if (columnIndex < 0 || cursor.isNull(columnIndex)) {
      return null
    }
    return cursor.getLong(columnIndex)
  }

  private fun deleteRecursively(file: File): Boolean {
    if (file.isDirectory) {
      file.listFiles()?.forEach { child ->
        if (!deleteRecursively(child)) {
          return false
        }
      }
    }

    return file.delete()
  }

  private fun copyFileOrDirectory(source: File, destination: File) {
    if (destination.exists() && !deleteRecursively(destination)) {
      throw IOException("Unable to replace existing destination: ${destination.path}")
    }

    if (source.isDirectory) {
      if (!destination.exists() && !destination.mkdirs()) {
        throw IOException("Unable to create directory: ${destination.path}")
      }

      source.listFiles()?.forEach { child ->
        copyFileOrDirectory(child, File(destination, child.name))
      }
      return
    }

    destination.parentFile?.mkdirs()
    source.inputStream().use { input ->
      destination.outputStream().use { output ->
        input.copyTo(output)
      }
    }
  }
}
