import { createPanel, renderList } from './shared.js';

function createCalendarPanel() {
  const panel = createPanel('valdris-calendar', 'Festival Calendar');
  return {
    panel,
    update(days) {
      renderList(panel, days.map((day) => `Day ${day.day}: ${day.name || day.state || day}`));
    }
  };
}

export { createCalendarPanel };
