import { useLanguage } from "@/hooks/useLanguage";
import { useEffect, useState } from "react";

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
const T = ({ children, as: Tag = "span", className, style }: Props) => {
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

  return <Tag className={className} style={style}>{translated}</Tag>;
};

export default T;
