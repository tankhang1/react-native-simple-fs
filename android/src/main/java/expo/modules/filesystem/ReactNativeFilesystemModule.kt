package expo.modules.filesystem

import android.content.ContentValues
import android.net.Uri
import android.os.Build
import android.os.Environment
import android.provider.MediaStore
import expo.modules.interfaces.filesystem.Permission
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.exception.Exceptions
import java.io.File
import java.io.FileNotFoundException
import java.io.IOException
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

    // Defines constant property on the module.
    Constant("PI") {
      Math.PI
    }

    // Defines event names that the module can send to JavaScript.
    Events("onChange")

    // Defines a JavaScript synchronous function that runs the native code on the JavaScript thread.
    Function("hello") {
      "Hello world! 👋"
    }

    // Defines a JavaScript function that always returns a Promise and whose native code
    // is by default dispatched on the different thread than the JavaScript runtime runs on.
    AsyncFunction("setValueAsync") { value: String ->
      // Send an event to JavaScript.
      sendEvent("onChange", mapOf(
        "value" to value
      ))
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
