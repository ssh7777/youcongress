'use client';
export default function ErrorPage({reset}) { return <><h1>Unable to load this page</h1><p>Please try again. No internal error details are shown.</p><button onClick={reset}>Try again</button></>; }
