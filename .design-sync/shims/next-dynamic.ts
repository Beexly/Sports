// design-sync shim: next/dynamic -> eager import wrapped in React.lazy.
import * as React from "react";
export default function dynamic<P>(loader: () => Promise<{ default: React.ComponentType<P> } | React.ComponentType<P>>, opts?: { ssr?: boolean; loading?: React.ComponentType }) {
  const Lazy = React.lazy(async () => {
    const m = await loader();
    return "default" in (m as object) ? (m as { default: React.ComponentType<P> }) : { default: m as React.ComponentType<P> };
  });
  const Fallback = opts?.loading;
  return function Dynamic(props: P & React.JSX.IntrinsicAttributes) {
    return React.createElement(React.Suspense, { fallback: Fallback ? React.createElement(Fallback) : null }, React.createElement(Lazy, props));
  };
}
