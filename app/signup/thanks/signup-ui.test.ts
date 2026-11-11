// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, createElement as h, useEffect, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { TagPicker, PhotoUploader } from "./family-form";
import { OnboardingWizard } from "./onboarding-wizard";
import { useOnboardingGate } from "./onboarding-gate";
import { VisibilityControl } from "@/components/visibility-control";
import { ShareSequence } from "./share-sequence";
import type { OnboardingStep } from "./onboarding-steps";

const mocks = vi.hoisted(() => ({ replace: vi.fn(), visibility: vi.fn(), token: vi.fn(), fields: vi.fn(), setup: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: mocks.replace }), usePathname: () => "/signup/thanks", useSearchParams: () => new URLSearchParams() }));
vi.mock("./actions", () => ({ addChild: vi.fn(), patchChild: vi.fn(), removeChild: vi.fn(), getShareSetupState: mocks.setup }));
vi.mock("@/lib/share-actions", () => ({ setShareVisibility: mocks.visibility, setShareVisibilityByToken: mocks.token, setShareFields: mocks.fields }));
vi.mock("@/components/mention-caption-input", () => ({ MentionCaptionInput: () => null }));

let host: HTMLDivElement;
let root: Root;
beforeEach(() => {
  vi.clearAllMocks();
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  mocks.visibility.mockImplementation(async (_id, visibility) => ({ visibility }));
  mocks.token.mockImplementation(async (_id, visibility) => ({ visibility }));
});
afterEach(async () => { await act(async () => root.unmount()); host.remove(); });
async function render(node: React.ReactNode) { await act(async () => root.render(node)); }
function button(text: string) { const found = [...host.querySelectorAll("button")].find(b => b.textContent === text); expect(found, text).toBeTruthy(); return found!; }
async function click(node: HTMLElement) { await act(async () => node.click()); }
async function type(value: string) {
  const input = host.querySelector<HTMLInputElement>('input:not([type="file"])')!;
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
  return input;
}
async function enter(value: string) { const input = await type(value); await act(async () => input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }))); }
const suggestions = ["Biking", "Chess", "Reading", "Music", "Art", "Cooking", "Hiking", "Gardening"];
function Picker({ initial = [] }: { initial?: string[] }) {
  const [value, onChange] = useState(initial);
  return h(TagPicker, { value, onChange, suggestions, placeholder: "Search interests" });
}
function selected() { return host.querySelectorAll('button[aria-label^="Remove "]'); }

describe("TagPicker interaction regressions", () => {
  it("separates selected and explore interests even when empty", async () => {
    await render(h(Picker));
    expect([...host.querySelectorAll("h4")].map(x => x.textContent)).toEqual(["Selected interests (0)", "Explore interests"]);
    expect(host.textContent).toContain("No interests selected yet.");
    expect(host.querySelector('label')?.htmlFor).toBe(host.querySelector('input')?.id);
  });
  it("keeps selected suggestions in place, pressed, with a visible check", async () => {
    await render(h(Picker));
    const suggestion = button("Biking");
    await click(suggestion);
    expect(suggestion.isConnected).toBe(true);
    expect(suggestion.getAttribute("aria-pressed")).toBe("true");
    expect(suggestion.querySelector("svg.lucide-check")).not.toBeNull();
    expect(suggestion.querySelector("svg")?.getAttribute("class")).not.toMatch(/hidden|opacity-0/);
    expect(selected()).toHaveLength(1);
    expect(host.textContent).toContain("Selected interests (1)");
    for (let i = 0; i < 3; i++) {
      await click(suggestion);
      expect(suggestion.getAttribute("aria-pressed")).toBe("false");
      expect(selected()).toHaveLength(0);
      await click(suggestion);
      expect(selected()).toHaveLength(1);
    }
    await click(selected()[0] as HTMLElement);
    expect(suggestion.getAttribute("aria-pressed")).toBe("false");
  });
  it("keeps a searched suggestion removed after blur and Continue", async () => {
    await render(wizard());
    await click(button("Biking"));
    const input = await type("biking");
    await act(async () => input.focus());
    const suggestion = host.querySelector<HTMLButtonElement>('button[aria-pressed="true"]')!;
    await act(async () => {
      const mouseDown = new MouseEvent("mousedown", { bubbles: true, cancelable: true });
      suggestion.dispatchEvent(mouseDown);
      expect(mouseDown.defaultPrevented).toBe(true);
      suggestion.click();
    });
    expect(selected()).toHaveLength(0);
    expect(input.value).toBe("");
    await act(async () => input.dispatchEvent(new FocusEvent("focusout", { bubbles: true })));
    expect(selected()).toHaveLength(0);
    await click(button("Continue →"));
    await click(button("← Back"));
    expect(selected()).toHaveLength(0);
    expect(button("Biking").getAttribute("aria-pressed")).toBe("false");
  });
  it("renders every selected interest beyond six without a collapsed summary", async () => {
    await render(h(Picker, { initial: suggestions }));
    expect(selected()).toHaveLength(8);
    for (const item of selected()) {
      expect(item.closest('[hidden], .hidden')).toBeNull();
      expect(item.parentElement?.className).not.toMatch(/max-h|overflow-hidden|line-clamp/);
    }
    expect(host.textContent).not.toMatch(/show more|show less/i);
  });
  it("deduplicates existing and custom labels across Enter and blur, ignoring case", async () => {
    await render(h(Picker));
    await enter(" biking ");
    await enter("BIKING");
    expect(selected()).toHaveLength(1);
    expect(selected()[0].getAttribute("aria-label")).toBe("Remove Biking");
    let input = await type(" Model rockets ");
    await act(async () => input.dispatchEvent(new FocusEvent("focusout", { bubbles: true })));
    await enter("MODEL ROCKETS");
    input = await type("model rockets");
    await act(async () => input.dispatchEvent(new FocusEvent("focusout", { bubbles: true })));
    expect(selected()).toHaveLength(2);
    expect(selected()[1].getAttribute("aria-label")).toBe("Remove Model rockets");
  });
  it("filters explore results without hiding selected summary", async () => {
    await render(h(Picker, { initial: ["Biking", "Chess"] }));
    await type("Music");
    expect(selected()).toHaveLength(2);
    expect(host.querySelectorAll('button[aria-pressed]')).toHaveLength(1);
    expect(button("Music").getAttribute("aria-pressed")).toBe("false");
  });
});

it("labels the photo picker and gives its native file button high contrast", async () => {
  const onSave = vi.fn();
  await render(h(PhotoUploader, { initialPhotos: [], initialPreviews: {}, candidates: [], onSave }));
  const input = host.querySelector<HTMLInputElement>('input[type="file"]')!;
  expect(input.getAttribute("aria-label")).toBe("Choose photos");
  expect(input.accept).toBe("image/*");
  expect(input.multiple).toBe(true);
  expect(input.classList.contains("file:bg-amber-400")).toBe(true);
  expect(input.classList.contains("file:text-black")).toBe(true);
  expect(onSave).not.toHaveBeenCalled();
});

const steps: OnboardingStep[] = [
  { key: "interests", title: "Interests", blurb: "", skippable: true },
  { key: "share", title: "Sharing", blurb: "", skippable: true },
  { key: "invite", title: "Invite", blurb: "", skippable: true },
];
function Gate() {
  const gate = useOnboardingGate();
  useEffect(() => { gate?.setBlocked("share", true); }, [gate]);
  return h("p", null, "Blocked content");
}
function wizard(skip = vi.fn(async () => {}), blocked = false) {
  return h(OnboardingWizard, { steps, finishHref: "/welcome", skipActions: { share: skip }, children: [h(Picker, { key: "interests" }), blocked ? h(Gate, { key: "share" }) : h("p", { key: "share" }, "Sharing content"), h("p", { key: "invite" }, "Invite content")] });
}
describe("OnboardingWizard navigation", () => {
  it("retains selected interests through Continue and Back and exposes a safe-area sticky footer", async () => {
    await render(wizard());
    await click(button("Biking"));
    const next = button("Continue →");
    expect(next.parentElement?.classList.contains("sticky")).toBe(true);
    expect(next.parentElement?.classList.contains("bottom-0")).toBe(true);
    expect(next.parentElement?.className).toContain("env(safe-area-inset-bottom)");
    await click(next);
    expect(host.querySelector("h2")?.textContent).toBe("Sharing");
    expect(selected()[0].closest("[hidden]")).not.toBeNull();
    await click(button("← Back"));
    expect(selected()[0].closest("[hidden]")).toBeNull();
    expect(host.querySelector('button[aria-pressed="true"]')?.textContent).toBe("Biking");
  });
  it("calls the existing skip action once and advances to Finish", async () => {
    const skip = vi.fn(async () => {});
    await render(wizard(skip));
    await click(button("Continue →"));
    await click(button("Skip for now"));
    expect(skip).toHaveBeenCalledTimes(1);
    expect(host.querySelector('a')?.getAttribute("href")).toBe("/welcome");
    expect(mocks.replace).toHaveBeenLastCalledWith("/signup/thanks?step=invite", { scroll: true });
  });
  it("prevents Continue, Skip and dot-jumps past a blocked step", async () => {
    const skip = vi.fn(async () => {});
    await render(wizard(skip, true));
    await click(host.querySelector('[aria-label="Step 3: Invite"]') as HTMLElement);
    expect(host.querySelector("h2")?.textContent).toBe("Sharing");
    await click(button("Continue →"));
    expect(host.textContent).toContain("Complete this step to continue.");
    expect([...host.querySelectorAll("button")].some(b => b.textContent === "Skip for now")).toBe(false);
    expect(skip).not.toHaveBeenCalled();
    await click(button("← Back"));
    expect(host.querySelector("h2")?.textContent).toBe("Interests");
  });
});

describe("Privacy descriptions and actions", () => {
  it("describes initial OHS visibility without mutating it on mount", async () => {
    await render(h(VisibilityControl, { id: "fixture-signup", mode: "signup", value: "ohs", editable: true, loggedIn: true }));
    expect(host.querySelector('[role="group"]')?.getAttribute("aria-label")).toBe("Who can see this profile?");
    expect(host.textContent).toContain("visible to signed-in OHS family members");
    expect(mocks.visibility).not.toHaveBeenCalled();
    expect(mocks.token).not.toHaveBeenCalled();
    await click(button("Just me"));
    expect(mocks.visibility).toHaveBeenLastCalledWith("fixture-signup", "private");
    expect(host.textContent).toContain("hidden from other members");
    expect(button("Just me").getAttribute("aria-pressed")).toBe("true");
    await click(button("OHS Families"));
    expect(host.textContent).toContain("visible to signed-in OHS family members");
  });
  it("rolls back description and pressed state when a visibility write fails", async () => {
    mocks.token.mockResolvedValue({ error: "Could not save" });
    await render(h(VisibilityControl, { id: "fixture-token", mode: "token", value: "private", editable: true, loggedIn: true }));
    await click(button("OHS Families"));
    expect(mocks.token).toHaveBeenCalledWith("fixture-token", "ohs");
    expect(host.textContent).toContain("Could not save");
    expect(host.textContent).toContain("hidden from other members");
    expect(button("Just me").getAttribute("aria-pressed")).toBe("true");
  });
  it("does not imply verification or private defaults in sharing introduction and master question", async () => {
    mocks.setup.mockResolvedValue({ questions: [], visibility: "ohs", fields: [], shareUrl: null });
    await render(h(ShareSequence, { signupId: "fixture-signup" }));
    expect(host.textContent).toContain("Completed signups are initially shared with OHS families");
    expect(host.textContent).toContain("Skipping keeps your current visibility setting.");
    expect(host.textContent).not.toMatch(/Skip for now.{0,40}private/i);
    expect(host.textContent).not.toMatch(/verified|private by default|starts? private/i);
    expect(mocks.visibility).not.toHaveBeenCalled();
    await click(button("Choose what's visible →"));
    expect(host.textContent).toContain("signed-in OHS family members");
    expect(host.textContent).not.toMatch(/verified|private by default|starts? private/i);
    expect(mocks.visibility).not.toHaveBeenCalled();
    await click(button("No, keep it private"));
    expect(mocks.visibility).toHaveBeenCalledWith("fixture-signup", "private");
    expect(host.textContent).toContain("Your profile is private");
  });
});
