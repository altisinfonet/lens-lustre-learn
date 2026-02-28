import { useLanguage } from "@/hooks/useLanguage";
import { useEffect, useState, forwardRef } from "react";

interface Props {
  children: string;
  as?: keyof JSX.IntrinsicElements;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Wraps text content and auto-translates it based on the user's preferred language.
 * Usage: <T>Hello World</T>
 */
const T = forwardRef<HTMLElement, Props>(({ children, as: Tag = "span", className, style }, ref) => {
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
    return () => { cancelled = true; };
  }, [children, language, translateBatch]);

  const Element = Tag as any;
  return <Element ref={ref} className={className} style={style}>{translated}</Element>;
});

T.displayName = "T";

export default T;
