import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import App from './App';

// The application uses the real service client, so these tests stub fetch.

function stubFetch(respond: (url: string, body: unknown) => Response | Promise<Response>) {
  const fetchMock = vi.fn<typeof fetch>(async (url, init) => respond(String(url), JSON.parse(String(init?.body))));
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('App', () => {
  it('AC-054 shows the heading, the display, and the keypad', () => {
    render(<App />);

    expect(screen.getByRole('heading', { level: 1, name: 'Calculator' })).toBeInTheDocument();
    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(/^0$/);
    expect(screen.getByRole('group', { name: 'Calculator keypad' })).toBeInTheDocument();
  });

  it('AC-052 evaluates a chained expression through the service', async () => {
    const fetchMock = stubFetch((url, body) => {
      const { numbers } = body as { numbers: number[] };
      if (url.endsWith('/multiply')) return json({ operation: 'multiply', result: numbers[0] * numbers[1] });
      return json({ operation: 'add', result: numbers[0] + numbers[1] });
    });
    const user = userEvent.setup();
    render(<App />);

    await user.keyboard('2+3*4{Enter}');

    expect(await screen.findByText('2 + 3 × 4 =')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(/^14$/);
    expect(fetchMock.mock.calls.map(([url, init]) => [url, JSON.parse(String(init?.body))])).toEqual([
      ['/api/v1/multiply', { numbers: [3, 4] }],
      ['/api/v1/add', { numbers: [2, 12] }],
    ]);
  });

  it('AC-034 shows the message for an error from the service', async () => {
    stubFetch(() => json({ error: { code: 'DIVISION_BY_ZERO', message: 'division by zero: numbers[1] is zero' } }, 422));
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: '1' }));
    await user.click(screen.getByRole('button', { name: 'divide' }));
    await user.click(screen.getByRole('button', { name: '0' }));
    await user.click(screen.getByRole('button', { name: 'equals' }));

    expect(await screen.findByRole('alert')).toHaveTextContent("Can't divide by zero");
  });

  it('AC-037 shows a message when the service cannot be reached', async () => {
    stubFetch(() => Promise.reject(new TypeError('Failed to fetch')));
    const user = userEvent.setup();
    render(<App />);

    await user.keyboard('2+3{Enter}');

    expect(await screen.findByRole('alert')).toHaveTextContent("Can't reach the calculator service");
  });

  it('AC-038 shows a general message when the service answers with something unexpected', async () => {
    stubFetch(() => new Response('<html>Bad Gateway</html>', { status: 502 }));
    const user = userEvent.setup();
    render(<App />);

    await user.keyboard('2+3{Enter}');

    expect(await screen.findByRole('alert')).toHaveTextContent('Something went wrong');
  });
});
