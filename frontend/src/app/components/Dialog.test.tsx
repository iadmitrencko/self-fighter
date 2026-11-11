import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StrictMode, useState } from 'react';
import { describe, expect, it } from 'vitest';
import { ConfirmDialog } from './Dialog';

function Asking() {
  const [open, setOpen] = useState(true);
  const [answer, setAnswer] = useState('none');

  return (
    <>
      <p>{answer}</p>
      {open && (
        <ConfirmDialog
          title="Видалити?"
          text="Назавжди."
          confirm="Видалити"
          onConfirm={() => {
            setAnswer('confirmed');
            setOpen(false);
          }}
          onCancel={() => {
            setAnswer('cancelled');
            setOpen(false);
          }}
        />
      )}
    </>
  );
}

describe('a dialog', () => {
  // React in development opens a dialog, takes it away and opens it again: the second one stays.
  it('stays open when React opens it twice', () => {
    render(
      <StrictMode>
        <Asking />
      </StrictMode>,
    );

    expect(screen.getByRole('dialog', { name: 'Видалити?' })).toBeTruthy();
    expect(screen.getByText('none')).toBeTruthy();
  });

  it('closes with the answer of the person', async () => {
    const user = userEvent.setup();
    render(
      <StrictMode>
        <Asking />
      </StrictMode>,
    );

    await user.click(screen.getByRole('button', { name: 'Скасувати' }));

    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByText('cancelled')).toBeTruthy();
  });
});
