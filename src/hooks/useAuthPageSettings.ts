import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface AuthPageConfig {
  heading: string;
  heading_accent: string;
  subtitle: string;
  background_image: string;
  show_logo: boolean;
  logo_size: number; // tailwind h-X w-X value
  show_google: boolean;
  show_apple: boolean;
}

export interface AuthPageSettings {
  login: AuthPageConfig;
  signup: AuthPageConfig;
}

export const DEFAULT_AUTH_SETTINGS: AuthPageSettings = {
  login: {
    heading: "Welcome",
    heading_accent: "Back",
    subtitle: "Sign in to continue your journey.",
    background_image: "/images/hero-2.jpg",
    show_logo: true,
    logo_size: 48,
    show_google: true,
    show_apple: true,
  },
  signup: {
    heading: "Join the",
    heading_accent: "Community",
    subtitle: "Create your account and start sharing your vision.",
    background_image: "/images/innocence.jpg",
    show_logo: true,
    logo_size: 48,
    show_google: true,
    show_apple: true,
  },
};

export function useAuthPageSettings() {
  const [settings, setSettings] = useState<AuthPageSettings>(DEFAULT_AUTH_SETTINGS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase
          .from("site_settings")
          .select("value")
          .eq("key", "auth_page_settings")
          .maybeSingle();
        if (data?.value) {
          const val = data.value as unknown as AuthPageSettings;
          setSettings({
            login: { ...DEFAULT_AUTH_SETTINGS.login, ...val.login },
            signup: { ...DEFAULT_AUTH_SETTINGS.signup, ...val.signup },
          });
        }
      } catch {
        // use defaults
      }
      setLoading(false);
    })();
  }, []);

  return { settings, loading };
}
