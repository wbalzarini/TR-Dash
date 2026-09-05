import type { Metadata } from "next";
import { SettingsForm } from "@/components/SettingsForm";

export const metadata: Metadata = {
  title: "Settings · Trident Island",
};

export default function SettingsPage() {
  return <SettingsForm />;
}
