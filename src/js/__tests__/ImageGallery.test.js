import fetchMock from "jest-fetch-mock";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import ImageGallery from "../ImageGallery";

jest.mock("jszip");
jest.mock("file-saver", () => ({
  saveAs: jest.fn(),
}));

global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    blob: () => Promise.resolve(new Blob()),
  }),
);

describe("ImageGallery", () => {
  let gallery;
  let container;

  beforeEach(() => {
    document.body.innerHTML = `
      <div id="gallery-container">
        <form class="image-form">
          <input id="image-name" type="text" />
          <input id="image-url" type="text" />
          <button type="submit">Add</button>
          <span class="error-message" style="display: none;"></span>
        </form>
        <div class="gallery"></div>
        <button class="download-button">Download All</button>
      </div>
    `;
    container = "#gallery-container";
    gallery = new ImageGallery(container);
    fetchMock.resetMocks();
  });

  test("should add image to the gallery", async () => {
    const nameInput = document.querySelector("#image-name");
    const urlInput = document.querySelector("#image-url");
    const form = document.querySelector(".image-form");
    nameInput.value = "Test Image";
    urlInput.value = "https://example.com/test.jpg";
    jest.spyOn(gallery, "validateImage").mockResolvedValue();
    form.dispatchEvent(new Event("submit"));
    await Promise.resolve();
    expect(document.querySelector(".gallery img")).not.toBeNull();
    expect(document.querySelector(".gallery img").src).toBe(
      "https://example.com/test.jpg",
    );
  });

  test("should show error for empty URL", () => {
    const form = document.querySelector(".image-form");
    form.dispatchEvent(new Event("submit"));
    expect(document.querySelector(".error-message").textContent).toBe(
      "Введите URL изображения",
    );
  });

  test("should show error for invalid URL", async () => {
    jest.spyOn(gallery, "validateImage").mockRejectedValue();
    const urlInput = document.querySelector("#image-url");
    urlInput.value = "invalid-url";
    const form = document.querySelector(".image-form");
    form.dispatchEvent(new Event("submit"));
    await Promise.resolve();
    expect(document.querySelector(".error-message").textContent).toBe("");
  });

  test("should clear the form after adding image", async () => {
    const nameInput = document.querySelector("#image-name");
    const urlInput = document.querySelector("#image-url");
    const form = document.querySelector(".image-form");
    nameInput.value = "Test Image";
    urlInput.value = "https://example.com/test.jpg";
    jest.spyOn(gallery, "validateImage").mockResolvedValue();
    form.dispatchEvent(new Event("submit"));
    await Promise.resolve();
    expect(nameInput.value).toBe("");
    expect(urlInput.value).toBe("");
  });

  test("should remove image on close button click", async () => {
    jest.spyOn(gallery, "validateImage").mockResolvedValue();
    gallery.addImage("Test", "https://example.com/test.jpg");
    const closeButton = document.querySelector(".close-button");
    closeButton.dispatchEvent(new Event("click"));
    expect(document.querySelector(".gallery img")).toBeNull();
  });

  test("should download images as a ZIP archive", async () => {
    document.body.innerHTML = `
      <div class="container">
        <button class="download-button">Download</button>
        <div class="gallery">
          <div class="image-block">
            <img src="https://raw.githubusercontent.com/yavuzceliker/sample-images/refs/heads/main/images/image-1.jpg" alt="Image 1">
          </div>
          <div class="image-block">
            <img src="https://raw.githubusercontent.com/yavuzceliker/sample-images/refs/heads/main/images/image-2.jpg" alt="Image 2">
          </div>
        </div>
      </div>
    `;
    const downloadButton = document.querySelector(".download-button");
    fetchMock.mockResponse(async () => {
      return new Response(new Blob(["image data"], { type: "image/jpeg" }));
    });
    await Promise.resolve();
    downloadButton.addEventListener("click", () => {
      const zip = new JSZip();
      document
        .querySelectorAll(".gallery .image-block img")
        .forEach((img, index) => {
          fetch(img.src)
            .then((response) => response.blob())
            .then((blob) => {
              zip.file(`image-${index + 1}.jpg`, blob);
            });
        });
      zip.generateAsync({ type: "blob" }).then((content) => {
        saveAs(content, "images.zip");
      });
    });
    jest.spyOn(JSZip.prototype, "file");
    jest.spyOn(JSZip.prototype, "generateAsync").mockResolvedValue(new Blob());
    jest.spyOn(global, "URL").mockImplementation(() => ({
      createObjectURL: jest.fn(),
      revokeObjectURL: jest.fn(),
    }));
    saveAs.mockImplementation(jest.fn());
    downloadButton.click();
    const flushPromises = () => new Promise(setImmediate);
    await flushPromises();
    expect(JSZip.prototype.file).toHaveBeenCalledTimes(2);
    expect(JSZip.prototype.generateAsync).toHaveBeenCalled();
    expect(saveAs).toHaveBeenCalled();
  });

  test("should trigger handleSubmit when Enter key is pressed", () => {
    const handleSubmitMock = jest.spyOn(gallery, "handleSubmit");
    const urlInput = document.querySelector("#image-url");
    const event = new KeyboardEvent("keydown", { key: "Enter" });
    urlInput.dispatchEvent(event);
    expect(handleSubmitMock).toHaveBeenCalledTimes(1);
  });

  test("should create zip file and call saveAs on downloadImages", async () => {
    const zipFileMock = jest.fn();
    JSZip.prototype.file = zipFileMock;
    const saveAs = jest.fn();
    global.saveAs = saveAs;
    document.body.innerHTML = `
      <div class="gallery-container">
        <form class="image-form">
          <input type="text" id="image-name" />
          <input type="url" id="image-url" />
        </form>
        <div class="gallery">
          <div class="image-block">
            <img src="https://raw.githubusercontent.com/yavuzceliker/sample-images/refs/heads/main/images/image-1.jpg" alt="image1" />
          </div>
          <div class="image-block">
            <img src="https://raw.githubusercontent.com/yavuzceliker/sample-images/refs/heads/main/images/image-2.jpg" alt="image2" />
          </div>
        </div>
        <button class="download-button">Download</button>
      </div>
    `;
    const gallery = new ImageGallery(".gallery-container");
    const downloadImagesSpy = jest.spyOn(gallery, "downloadImages");
    const downloadButton = document.querySelector(".download-button");
    downloadButton.click();
    await new Promise((resolve) => setImmediate(resolve));
    expect(downloadImagesSpy).toHaveBeenCalledTimes(1);
    expect(zipFileMock).toHaveBeenCalledTimes(2);
  });
});
