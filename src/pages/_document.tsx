import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <link href="https://unpkg.com/mathlive/dist/mathlive.core.css" rel="stylesheet" />
        <link href="https://unpkg.com/mathlive/dist/mathlive.css" rel="stylesheet" />
      </Head>
      <body className="antialiased">
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
