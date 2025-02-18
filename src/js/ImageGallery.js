import JSZip from "jszip";
import { saveAs } from "file-saver";

class ImageGallery {
  constructor(container) {
    this.container = document.querySelector(container);
    this.form = this.container.querySelector(".image-form");
    this.nameInput = this.form.querySelector("#image-name");
    this.urlInput = this.form.querySelector("#image-url");
    this.errorMsg = this.form.querySelector(".error-message");
    this.gallery = this.container.querySelector(".gallery");
    this.downloadButton = this.container.querySelector(".download-button");
    this.imageCount = 1;
    this.init();
  }

  init() {
    this.form.addEventListener("submit", (e) => this.handleSubmit(e));
    this.urlInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        this.handleSubmit(e);
      }
    });
    this.downloadButton.addEventListener("click", () => this.downloadImages());
  }

  handleSubmit(e) {
    e.preventDefault();
    const name = this.nameInput.value.trim();
    const url = this.urlInput.value.trim();
    if (!url) {
      this.showError("Введите URL изображения");
      return;
    }
    this.validateImage(url)
      .then(() => this.addImage(name, url))
      .catch(() => this.showError("Неверный URL изображения"));
  }

  validateImage(url) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.src = url;
      img.onload = () => resolve();
      img.onerror = () => reject();
    });
  }

  addImage(name, url) {
    const imageBlock = document.createElement("div");
    imageBlock.classList.add("image-block");
    const img = document.createElement("img");
    img.src = url;
    img.alt = name;
    const closeButton = document.createElement("span");
    closeButton.classList.add("close-button");
    closeButton.innerHTML = "&times;";
    closeButton.addEventListener("click", () => imageBlock.remove());
    imageBlock.appendChild(img);
    imageBlock.appendChild(closeButton);
    this.gallery.appendChild(imageBlock);
    this.clearForm();
  }

  showError(message) {
    this.errorMsg.textContent = message;
    this.errorMsg.style.display = "block";
  }

  clearForm() {
    this.nameInput.value = "";
    this.urlInput.value = "";
    this.errorMsg.style.display = "none";
  }

  downloadImages() {
    const zip = new JSZip();
    const images = this.gallery.querySelectorAll(".image-block img");
    const nameCounts = {};
    let unnamedCount = 1;
    images.forEach((img, index) => {
      let name = img.alt || `no_name_${unnamedCount++}`;
      if (nameCounts[name]) {
        nameCounts[name]++;
        name = `${name}_${nameCounts[name]}`;
      } else {
        nameCounts[name] = 1;
      }
      fetch(img.src)
        .then((response) => {
          if (!response.ok) {
            console.error(`Failed to fetch image: ${img.src}`);
            return;
          }
          return response.blob();
        })
        .then((blob) => {
          if (blob) {
            zip.file(`${name}.jpg`, blob);
          }
          if (index === images.length - 1) {
            zip
              .generateAsync({
                type: "blob",
              })
              .then((content) => {
                saveAs(content, "gallery.zip");
              });
          }
        })
        .catch((err) => {
          console.error("Error fetching image: ", err);
        });
    });
  }
}

export default ImageGallery;
