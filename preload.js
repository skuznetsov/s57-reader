// All of the Node.js APIs are available in the preload process.
// It has the same sandbox as a Chrome extension.
window.addEventListener('DOMContentLoaded', () => {
  const element = document.getElementById("mapArea");
  let elemRect = element.getBoundingClientRect();
  element.width = window.innerWidth - 4;
  element.height = window.innerHeight  - 23;
})
