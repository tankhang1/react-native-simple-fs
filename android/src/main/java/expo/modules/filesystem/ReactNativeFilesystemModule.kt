package expo.modules.filesystem

import android.content.ContentValues
import android.net.Uri
import android.os.Build
import android.os.Environment
import android.provider.MediaStore
import android.webkit.MimeTypeMap
import expo.modules.interfaces.filesystem.Permission
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.exception.Exceptions
import java.io.File
import java.io.FileNotFoundException
import java.io.FileOutputStream
import java.io.IOException
import java.net.HttpURLConnection
import java.net.URL
import java.util.EnumSet

class ReactNativeFilesystemModule : Module() {
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

    AsyncFunction("downloadFile") { url: String, destinationPath: String, options: Map<String, Any>? ->
      validateFileAccess(destinationPath, Permission.WRITE)
      downloadFile(url, destinationPath, options?.get("mimeType") as? String)
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

  private fun downloadFile(url: String, destinationPath: String, mimeType: String?): Map<String, Any> {
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
    var destinationFile = File(destinationPath)

    try {
      connection.connect()

      val statusCode = connection.responseCode
      if (statusCode !in 200..299) {
        throw IOException("Download failed with HTTP $statusCode for URL: $url")
      }

      destinationFile = resolveDownloadTarget(
        destinationPath = destinationPath,
        explicitMimeType = mimeType,
        suggestedFilename = connection.getHeaderField("Content-Disposition"),
        responseMimeType = connection.contentType
      )
      destinationFile.parentFile?.mkdirs()

      var bytesWritten = 0L
      connection.inputStream.use { inputStream ->
        FileOutputStream(destinationFile).use { outputStream ->
          val buffer = ByteArray(DEFAULT_BUFFER_SIZE)
          while (true) {
            val bytesRead = inputStream.read(buffer)
            if (bytesRead < 0) {
              break
            }

            outputStream.write(buffer, 0, bytesRead)
            bytesWritten += bytesRead.toLong()
          }
          outputStream.flush()
        }
      }

      return mapOf(
        "path" to destinationFile.absolutePath,
        "bytesWritten" to bytesWritten,
        "statusCode" to statusCode
      )
    } catch (error: Exception) {
      if (destinationFile.exists()) {
        destinationFile.delete()
      }
      throw error
    } finally {
      connection.disconnect()
    }
  }

  private fun resolveDownloadTarget(
    destinationPath: String,
    explicitMimeType: String?,
    suggestedFilename: String?,
    responseMimeType: String?
  ): File {
    val destinationFile = File(destinationPath)
    if (destinationFile.extension.isNotEmpty()) {
      return destinationFile
    }

    val inferredExtension = extensionFromMimeType(explicitMimeType)
      ?: extensionFromContentDisposition(suggestedFilename)
      ?: extensionFromMimeType(responseMimeType)

    if (inferredExtension.isNullOrEmpty()) {
      return destinationFile
    }

    return File(destinationFile.parentFile, "${destinationFile.name}.$inferredExtension")
  }

  private fun extensionFromContentDisposition(contentDisposition: String?): String? {
    val filename = contentDisposition
      ?.split(';')
      ?.map { it.trim() }
      ?.firstOrNull { it.startsWith("filename=", ignoreCase = true) }
      ?.substringAfter('=')
      ?.trim('"')
      ?: return null

    val extension = filename.substringAfterLast('.', "")
    return extension.ifEmpty { null }
  }

  private fun extensionFromMimeType(mimeType: String?): String? {
    val sanitizedMimeType = mimeType?.substringBefore(';')?.trim()?.lowercase()
    return sanitizedMimeType?.let { MimeTypeMap.getSingleton().getExtensionFromMimeType(it) }
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
