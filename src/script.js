function remplir_accessoires() {
  fetch("accessoires.json")
    .then((res) => res.json())
    .then((jsonData) => {
      const template = document.getElementById("template_accessoires");
      const grid = document.getElementById("grid-container");

      const accessories = jsonData["tableau_accessoires"].map(
        (accessoryData) => {
          const newAccessory = template.cloneNode(true);

          newAccessory.innerHTML = Object.entries(accessoryData).reduce(
            (innerHTML, [key, value]) =>
              innerHTML.replaceAll(`{{accessoires-${key}}}`, value),
            newAccessory.innerHTML,
          );

          return document.importNode(newAccessory.content, true);
        },
      );

      accessories.forEach((accessory) => {
        grid.appendChild(accessory);
      });
    });
}

function keyboard_manager(ev) {
  ev.preventDefault();

  switch (ev.key) {
    case "Escape":
    case "ArrowDown":
    case "PageDown":
    case "2":
      scrollBy({ behavior: "smooth", top: window.innerHeight });
      break;
    case "ArrowUp":
    case "PageUp":
      scrollBy({ behavior: "smooth", top: -window.innerHeight });
      break;
  }
}

document.addEventListener("keydown", keyboard_manager);

remplir_accessoires();
