import { createFixtureClient, readAvailability } from './model.mjs';

const form = document.querySelector('form');
const select = document.querySelector('select');
const button = document.querySelector('button');
const output = document.querySelector('#results');
const notice = document.querySelector('#notice');

form.addEventListener('submit', async event => {
  event.preventDefault();
  button.disabled = true;
  output.setAttribute('aria-busy', 'true');
  notice.textContent = 'Reading three local fixture endpoints…';
  output.replaceChildren();
  try {
    const client = createFixtureClient(location.origin, select.value);
    const rows = await readAvailability(client);
    for (const row of rows) {
      const item = document.createElement('li');
      const heading = document.createElement('strong');
      const detail = document.createElement('p');
      heading.textContent = `${row.endpoint}: ${row.state}`;
      detail.textContent = row.detail;
      item.append(heading, detail);
      output.append(item);
    }
    notice.textContent = 'Offline fixture read complete. No wallet or payment action was taken.';
  } catch {
    notice.textContent = 'The offline demo could not run. Start the documented loopback server.';
  } finally {
    output.setAttribute('aria-busy', 'false');
    button.disabled = false;
  }
});
