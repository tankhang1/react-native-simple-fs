import { describe, expect, it, jest } from "@jest/globals";

jest.mock("expo", () => {
  class MockNativeModule {
    emit = jest.fn();
  }

  return {
    NativeModule: MockNativeModule,
    registerWebModule: (
      ModuleImplementation: new () => unknown,
      moduleName: string,
    ) => {
      const globalExpo = ((globalThis as any).expo ??= { modules: {} });
      if (!globalExpo.modules[moduleName]) {
        globalExpo.modules[moduleName] = new ModuleImplementation();
      }
      return globalExpo.modules[moduleName];
    },
  };
});

import ReactNativeFilesystemModule from "../ReactNativeFilesystemModule.web";

const unsupportedMessage =
  "react-native-filesystem does not currently support direct local filesystem access on web.";
const moduleInstance = ReactNativeFilesystemModule as any;

describe("ReactNativeFilesystemModule.web", () => {
  it("rejects exists on web", async () => {
    await expect(moduleInstance.exists("/tmp/file.txt")).rejects.toThrow(
      unsupportedMessage,
    );
  });

  it("rejects getDocumentsDirectory on web", async () => {
    await expect(moduleInstance.getDocumentsDirectory()).rejects.toThrow(
      unsupportedMessage,
    );
  });

  it("rejects readFile on web", async () => {
    await expect(moduleInstance.readFile("/tmp/file.txt")).rejects.toThrow(
      unsupportedMessage,
    );
  });

  it("rejects writeFile on web", async () => {
    await expect(
      moduleInstance.writeFile("/tmp/file.txt", "contents"),
    ).rejects.toThrow(unsupportedMessage);
  });

  it("rejects saveImageToLibrary on web", async () => {
    await expect(
      moduleInstance.saveImageToLibrary("/tmp/image.png", { mimeType: "image/png" }),
    ).rejects.toThrow(unsupportedMessage);
  });

  it("rejects getImages on web", async () => {
    await expect(moduleInstance.getImages({ limit: 20 })).rejects.toThrow(
      unsupportedMessage,
    );
  });

  it("rejects writeFileToDownloads on web", async () => {
    await expect(
      moduleInstance.writeFileToDownloads("example.txt", "contents", "text/plain"),
    ).rejects.toThrow(unsupportedMessage);
  });

  it("rejects downloadFile on web", async () => {
    await expect(
      moduleInstance.downloadFile(
        "https://www.w3.org/TR/PNG/iso_8859-1.txt",
        "/tmp/file.txt",
      ),
    ).rejects.toThrow(unsupportedMessage);
  });

  it("rejects deleteFile on web", async () => {
    await expect(moduleInstance.deleteFile("/tmp/file.txt")).rejects.toThrow(
      unsupportedMessage,
    );
  });

  it("rejects mkdir on web", async () => {
    await expect(moduleInstance.mkdir("/tmp/folder")).rejects.toThrow(
      unsupportedMessage,
    );
  });

  it("rejects readdir on web", async () => {
    await expect(moduleInstance.readdir("/tmp/folder")).rejects.toThrow(
      unsupportedMessage,
    );
  });

  it("rejects stat on web", async () => {
    await expect(moduleInstance.stat("/tmp/file.txt")).rejects.toThrow(
      unsupportedMessage,
    );
  });

  it("rejects move on web", async () => {
    await expect(
      moduleInstance.move("/tmp/file-a.txt", "/tmp/file-b.txt"),
    ).rejects.toThrow(unsupportedMessage);
  });

  it("rejects copy on web", async () => {
    await expect(
      moduleInstance.copy("/tmp/file-a.txt", "/tmp/file-b.txt"),
    ).rejects.toThrow(unsupportedMessage);
  });
});
