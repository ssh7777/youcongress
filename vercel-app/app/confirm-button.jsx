'use client';

export function ConfirmButton({children, message}) {
  return <button type="submit" className="danger" onClick={event => {
    if (!window.confirm(message)) event.preventDefault();
  }}>{children}</button>;
}
