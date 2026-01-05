function createPanel(id, title) {
  const panel = document.createElement('section');
  panel.id = id;
  panel.className = 'valdris-panel';
  panel.innerHTML = `
    <header class="valdris-panel__header">
      <h3>${title}</h3>
    </header>
    <div class="valdris-panel__body"></div>
  `;
  return panel;
}

function renderList(panel, items) {
  const body = panel.querySelector('.valdris-panel__body');
  body.innerHTML = items.map((item) => `<div class="valdris-panel__item">${item}</div>`).join('');
}

export { createPanel, renderList };
