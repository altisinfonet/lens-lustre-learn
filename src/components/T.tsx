import { useLanguage } from "@/hooks/useLanguage";
import { createElement, forwardRef, useEffect, useState } from "react";

type TagName = keyof JSX.IntrinsicElements;

interface Props {
  children: string;
  as?: TagName;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Wraps text content and auto-translates it based on the user's preferred language.
 * Usage: <T>Hello World</T>
 */
const T = forwardRef<HTMLElement, Props>(function T(
  { children, as = "span", className, style },
  ref,
) {
  const { language, translateBatch } = useLanguage();
  const [translated, setTranslated] = useState(children);

  useEffect(() => {
    if (language === "English" || !children) {
      setTranslated(children);
      return;
    }
    let cancelled = false;
    translateBatch([children]).then(([result]) => {
      if (!cancelled && result) setTranslated(result);
    });
    return () => {
      cancelled = true;
    };
  }, [children, language, translateBatch]);

  return createElement(as as any, { className, style, ref } as any, translated);
});

export default T;
