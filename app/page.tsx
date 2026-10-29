"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type FormEvent } from "react";
import type { Session } from "@supabase/supabase-js";
import {
  Archive,
  ArrowLeft,
  ChevronDown,
  ExternalLink,
  ImageOff,
  LogIn,
  LogOut,
  Menu,
  Plus,
  Search,
  SlidersHorizontal,
  UserRound,
  X,
} from "lucide-react";
import type { NormalizedCard } from "../graders/model";
import { createBrowserRepositories } from "../collection/runtime";
import {
  importLocalCards,
  type ImportResult,
} from "../collection/import-local";
import type { CollectionRepository } from "../collection/repository";
import { DuplicateCardError } from "../collection/repository";
import { isSupabaseConfigured, supabase } from "../lib/supabase";
import { lookupCertification } from "../lookup/client";
import { createManualCard } from "../lookup/manual";
import { ScanEntry } from "../scanner/ScanEntry";
import { PhotoEntry } from "../photo/PhotoEntry";
import type { PhotoFields, PhotoFieldSources } from "../photo/extract";
import { mergeCardEvidence, photoEvidence, sourceCard, type CardEvidenceSources, type EvidenceConflict } from "../photo/evidence";
import { certificationLinkLabel, generalVerificationUrl, graders, hasAutomaticLookup } from "../graders/registry";
import { getContactEmailHref } from "../lib/contact";
import { getDiagnosticsServerSnapshot, getDiagnosticsSnapshot, persistDiagnosticsUrlActivation, setDiagnosticsPreference, subscribeDiagnosticsPreference } from "../lib/diagnostics-preference";

type Grader = NormalizedCard["grader"];
type Card = NormalizedCard;
type ScanHandoffDiagnostic = {source:string;format:string;classification:string;rawPayload:string};
const buildId = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env?.VITE_BUILD_ID ?? "local-unversioned";
const seed: Card[] = [
  {
    id: "demo-1",
    grader: "PSA",
    certNumber: "DEMO-PSA-001",
    grade: "10",
    year: "2023",
    brand: "Topps",
    set: "Chrome",
    subject: "Collection preview",
    cardNumber: "#1",
    variant: "Refractor",
    frontImageUrl: "",
    backImageUrl: "",
    certUrl: "",
    population: 341,
    graderSpecific: { label: "Gem Mint" },
    addedAt: "2026-09-14",
  },
  {
    id: "demo-2",
    grader: "CGC",
    certNumber: "DEMO-CGC-002",
    grade: "9.5",
    year: "2022",
    brand: "Pokémon",
    set: "Silver Tempest",
    subject: "Sample slab",
    cardNumber: "#184",
    variant: "Full Art",
    frontImageUrl: "",
    backImageUrl: "",
    certUrl: "",
    population: null,
    graderSpecific: {},
    addedAt: "2026-09-13",
  },
  {
    id: "demo-3",
    grader: "Degree",
    certNumber: "DEMO-DEG-003",
    grade: "9",
    year: "2021",
    brand: "Panini",
    set: "Prizm",
    subject: "Demo card",
    cardNumber: "#7",
    variant: "Silver",
    frontImageUrl: "",
    backImageUrl: "",
    certUrl: "",
    population: 22,
    graderSpecific: { centering: "95%" },
    addedAt: "2026-09-12",
  },
];

function CardImage({ card, large = false }: { card: Card; large?: boolean }) {
  const [failed, setFailed] = useState(false);
  if (!card.frontImageUrl || failed)
    return (
      <div className={`image-placeholder ${large ? "large" : ""}`}>
        <ImageOff />
        <span>Image unavailable</span>
      </div>
    );
  return (
    <img
      className={`slab-image ${large ? "large" : ""}`}
      src={card.frontImageUrl}
      alt={`${card.subject} graded card`}
      onError={() => setFailed(true)}
    />
  );
}

export default function Home() {
  const [cards, setCards] = useState<Card[]>(seed),
    [repository, setRepository] = useState<CollectionRepository | null>(null),
    [session, setSession] = useState<Session | null>(null),
    [loading, setLoading] = useState(true),
    [query, setQuery] = useState(""),
    [grader, setGrader] = useState("All graders"),
    [grade, setGrade] = useState("All grades"),
    [sort, setSort] = useState("Newest"),
    [addOpen, setAddOpen] = useState(false),
    [addSessionId, setAddSessionId] = useState(0),
    [detail, setDetail] = useState<Card | null>(null),
    [step, setStep] = useState<
      "lookup" | "failed" | "manual" | "preview" | "scan" | "photos"
    >("lookup"),
    [lookupGrader, setLookupGrader] = useState<Grader>("Degree"),
    [lookupGraderExplicit, setLookupGraderExplicit] = useState(false),
    [cert, setCert] = useState(""),
    [draft, setDraft] = useState<Card | null>(null),
    [evidenceSources, setEvidenceSources] = useState<CardEvidenceSources>({}),
    [evidenceConflicts, setEvidenceConflicts] = useState<EvidenceConflict[]>([]),
    [scanHandoffDiagnostic, setScanHandoffDiagnostic] = useState<ScanHandoffDiagnostic|null>(null),
    [photoReturnToManual, setPhotoReturnToManual] = useState(false),
    [scanReturnToManual, setScanReturnToManual] = useState(false),
    [lookupMessage, setLookupMessage] = useState(""),
    [looking, setLooking] = useState(false),
    [notice, setNotice] = useState(""),
    [authOpen, setAuthOpen] = useState(false),
    [authMode, setAuthMode] = useState<
      "signin" | "signup" | "forgot" | "reset"
    >("signin"),
    [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [passwordConfirm, setPasswordConfirm] = useState(""),
    [authBusy, setAuthBusy] = useState(false),
    [authMessage, setAuthMessage] = useState(""),
    [localImport, setLocalImport] = useState<{
      cards: Card[];
      count: number;
    } | null>(null),
    [importResult, setImportResult] = useState<ImportResult | null>(null),
    [importBusy, setImportBusy] = useState(false);
  const lookupGeneration = useRef(0);
  const accountMenuRef = useRef<HTMLDivElement>(null);
  const addOpenerRef = useRef<HTMLElement | null>(null);
  const authOpenerRef = useRef<HTMLElement | null>(null);
  const detailOpenerRef = useRef<HTMLElement | null>(null);
  const dialogCloseHandlers = useRef({ add: () => {}, auth: () => {}, detail: () => {} });
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const diagnosticsEnabled = useSyncExternalStore(subscribeDiagnosticsPreference, getDiagnosticsSnapshot, getDiagnosticsServerSnapshot);
  const filtered = useMemo(
    () =>
      cards
        .filter((c) => {
          const hay = [
            c.subject,
            c.set,
            c.brand,
            c.certNumber,
            c.cardNumber,
            c.grader,
          ]
            .join(" ")
            .toLowerCase();
          return (
            hay.includes(query.toLowerCase()) &&
            (grader === "All graders" || c.grader === grader) &&
            (grade === "All grades" || c.grade === grade)
          );
        })
        .sort((a, b) =>
          sort === "Oldest"
            ? a.addedAt.localeCompare(b.addedAt)
            : sort === "Grade high"
              ? Number(b.grade) - Number(a.grade)
              : b.addedAt.localeCompare(a.addedAt),
        ),
    [cards, query, grader, grade, sort],
  );

  useEffect(() => {
    const { local } = createBrowserRepositories({ fallback: seed });
    let current = true;
    const switchRepository = async (nextSession: Session | null) => {
      const { active: next } = createBrowserRepositories({
        fallback: seed,
        client: supabase,
        userId: nextSession?.user.id,
      });
      setSession(nextSession);
      setRepository(next);
      setLoading(true);
      setNotice("");
      setImportResult(null);
      if (nextSession) setCards([]);
      try {
        const nextCards = await next.getCards();
        if (!current) return;
        setCards(nextCards);
        if (nextSession && local.hasStoredCollection()) {
          const localCards = await local.getCards();
          setLocalImport(
            localCards.length
              ? { cards: localCards, count: localCards.length }
              : null,
          );
        } else setLocalImport(null);
      } catch (error) {
        if (current)
          setNotice(
            `Collection unavailable: ${error instanceof Error ? error.message : "Please try again."}`,
          );
      } finally {
        if (current) setLoading(false);
      }
    };
    if (!supabase) {
      void switchRepository(null);
      return () => {
        current = false;
      };
    }
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (event === "PASSWORD_RECOVERY") {
        rememberDialogOpener(authOpenerRef);
        setAuthMode("reset");
        setAuthOpen(true);
        setAuthMessage("");
      }
      void switchRepository(nextSession);
    });
    return () => {
      current = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    persistDiagnosticsUrlActivation();
  }, []);

  function updateDiagnosticsPreference(enabled: boolean) {
    setDiagnosticsPreference(enabled);
  }

  useEffect(() => {
    if (!accountMenuOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setAccountMenuOpen(false);
        accountMenuRef.current?.querySelector<HTMLElement>(".account-menu-toggle")?.focus({ preventScroll: true });
      }
    };
    const onPointerDown = (event: PointerEvent) => {
      if (!accountMenuRef.current?.contains(event.target as Node)) setAccountMenuOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [accountMenuOpen]);

  function rememberDialogOpener(target: React.MutableRefObject<HTMLElement | null>) {
    target.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  }
  function blurDialogTextControl(selector: string) {
    const dialog = document.querySelector(selector);
    const active = document.activeElement;
    if (dialog?.contains(active) && active instanceof HTMLElement && active.matches(
      'input:not([type="range"]):not([type="file"]):not([type="hidden"]):not([type="checkbox"]):not([type="radio"]), textarea, [contenteditable="true"]',
    )) active.blur();
  }
  function restoreDialogFocus(target: React.MutableRefObject<HTMLElement | null>, fallbackSelector: string) {
    const opener = target.current;
    target.current = null;
    requestAnimationFrame(() => {
      const fallback = [...document.querySelectorAll<HTMLElement>(fallbackSelector)].find(
        (element) => element.getClientRects().length > 0,
      );
      const next = opener?.isConnected && opener.getClientRects().length > 0 ? opener : fallback;
      if (next?.isConnected) next.focus({ preventScroll: true });
    });
  }
  function closeAuth() {
    blurDialogTextControl(".auth-modal");
    setAuthOpen(false);
    restoreDialogFocus(authOpenerRef, ".account-menu-toggle");
  }

  function resetAddSession() {
    lookupGeneration.current += 1;
    setLooking(false);
    setStep("lookup");
    setLookupGrader("Degree");
    setLookupGraderExplicit(false);
    setCert("");
    setDraft(null);
    setEvidenceSources({});
    setEvidenceConflicts([]);
    setScanHandoffDiagnostic(null);
    setPhotoReturnToManual(false);
    setScanReturnToManual(false);
    setLookupMessage("");
    setNotice("");
  }
  function openAddCard(trigger?: HTMLElement) {
    if (trigger) addOpenerRef.current = trigger;
    else rememberDialogOpener(addOpenerRef);
    resetAddSession();
    setAddSessionId((id) => id + 1);
    setAddOpen(true);
  }

  useEffect(() => {
    const context = (
      document as Document & {
        modelContext?: {
          registerTool: (
            tool: unknown,
            options?: { signal: AbortSignal },
          ) => void | Promise<void>;
        };
      }
    ).modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    void context.registerTool(
      {
        name: "start_card_entry",
        title: "Start card entry",
        description:
          "Open the Add Card flow with a grader and certification number ready to verify.",
        inputSchema: {
          type: "object",
          properties: {
            grader: { type: "string", enum: graders },
            certNumber: { type: "string" },
          },
          required: ["grader", "certNumber"],
          additionalProperties: false,
        },
        annotations: { readOnlyHint: false, untrustedContentHint: false },
        execute(input: unknown) {
          const value = input as { grader?: Grader; certNumber?: string };
          if (
            !value.certNumber?.trim() ||
            !graders.includes(value.grader as (typeof graders)[number])
          )
            throw new Error(
              "A supported grader and certification number are required.",
            );
          rememberDialogOpener(addOpenerRef);
          resetAddSession();
          setLookupGrader(value.grader as Grader);
          setLookupGraderExplicit(true);
          setCert(value.certNumber.trim());
          setStep("lookup");
          setAddSessionId((id) => id + 1);
          setAddOpen(true);
          return {
            status: "ready",
            grader: value.grader,
            certNumber: value.certNumber.trim(),
          };
        },
      },
      { signal: lifecycle.signal },
    );
    return () => lifecycle.abort();
  }, []);

  async function beginLookup(input?: { grader: Grader; certNumber: string }) {
    const generation = ++lookupGeneration.current;
    const requestedGrader = input?.grader ?? lookupGrader;
    const requestedCert = input?.certNumber ?? cert;
    if (input) {
      setLookupGrader(input.grader);
      setLookupGraderExplicit(true);
      setCert(input.certNumber);
    }
    setNotice("");
    setLookupMessage("");
    if (!repository) {
      setNotice("Your collection is still loading.");
      return;
    }
    if (!requestedCert.trim()) {
      setNotice("Enter the certification number first.");
      return;
    }
    try {
      if (await repository.hasCard(requestedGrader, requestedCert)) {
        if (generation !== lookupGeneration.current) return;
        const duplicate = cards.find(
          (c) =>
            c.grader === requestedGrader &&
            c.certNumber.replace(/\s/g, "") ===
              requestedCert.trim().replace(/\s/g, ""),
        );
        if (duplicate) {
          detailOpenerRef.current = addOpenerRef.current;
          setDetail(duplicate);
        }
        closeAdd(!duplicate);
        setNotice("This slab is already in your collection.");
        return;
      }
    } catch (error) {
      if (generation !== lookupGeneration.current) return;
      setNotice(
        `Collection unavailable: ${error instanceof Error ? error.message : "Please try again."}`,
      );
      return;
    }
    if (generation !== lookupGeneration.current) return;
    if (!hasAutomaticLookup(requestedGrader)) {
      const created={ ...createManualCard(requestedGrader, requestedCert.trim()), certUrl: generalVerificationUrl(requestedGrader) };
      const merged=mergeCardEvidence(draft??created,evidenceSources,created,sourceCard(created,"manual"));
      setDraft(merged.card);setEvidenceSources(merged.sources);setEvidenceConflicts(merged.conflicts);
      setStep("manual");
      return;
    }
    setLooking(true);
    const result = await lookupCertification(
      requestedGrader,
      requestedCert.trim(),
    );
    if (generation !== lookupGeneration.current) return;
    if (result.ok) {
      const base = draft ?? result.card;
      const merged = mergeCardEvidence(base, evidenceSources, result.card, sourceCard(result.card, "lookup"));
      setDraft({...result.card,...merged.card,population:result.card.population,graderSpecific:result.card.graderSpecific,addedAt:result.card.addedAt});
      setEvidenceSources(merged.sources);
      setEvidenceConflicts(merged.conflicts);
      setStep("preview");
    } else {
      setLookupMessage(result.message);
      setStep("failed");
    }
    if (generation === lookupGeneration.current) setLooking(false);
  }
  function closeAdd(restoreFocus = true) {
    blurDialogTextControl(".add-modal");
    setAddOpen(false);
    resetAddSession();
    if (restoreFocus) restoreDialogFocus(addOpenerRef, ".desktop-add, .floating-add");
  }
  function closeDetail() {
    blurDialogTextControl(".detail-modal");
    setDetail(null);
    restoreDialogFocus(detailOpenerRef, ".desktop-add, .floating-add");
  }
  dialogCloseHandlers.current = { add: closeAdd, auth: closeAuth, detail: closeDetail };

  useEffect(() => {
    if (!authOpen && !addOpen && !detail) return;
    const selector = addOpen ? ".add-modal" : authOpen ? ".auth-modal" : ".detail-modal";
    const dialog = document.querySelector<HTMLElement>(selector);
    if (!dialog) return;
    const focusables = () => [...dialog.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([type="hidden"]):not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    )].filter((element) => element.getClientRects().length > 0);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (addOpen) dialogCloseHandlers.current.add();
        else if (authOpen) dialogCloseHandlers.current.auth();
        else if (detail) dialogCloseHandlers.current.detail();
        return;
      }
      if (event.key !== "Tab") return;
      const items = focusables();
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (!dialog.contains(document.activeElement)) {
        event.preventDefault();
        first.focus();
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    const focusFrame = requestAnimationFrame(() => dialog.querySelector<HTMLElement>(".close")?.focus({ preventScroll: true }));
    return () => {
      cancelAnimationFrame(focusFrame);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [authOpen, addOpen, detail]);
  function beginManual() {
    const created={...createManualCard(lookupGrader, cert),certUrl:generalVerificationUrl(lookupGrader)};
    const merged=mergeCardEvidence(draft??created,evidenceSources,created,sourceCard(created,"manual"));
    setDraft(merged.card);setEvidenceSources(merged.sources);setEvidenceConflicts(merged.conflicts);
    setStep("manual");
  }
  function update(key: keyof Card, value: string) {
    if (key === "certNumber") setCert(value);
    setDraft((d) => (d ? { ...d, [key]: value } : d));
    setEvidenceSources((current) => ({...current,[key]:"manual"}));
  }
  function photoFieldsFromCard(card: Card): PhotoFields {
    return {certNumber:card.certNumber,grade:card.grade,year:card.year,brand:card.brand,set:card.set,subject:card.subject,cardNumber:card.cardNumber,variant:card.variant};
  }
  function chooseConflict(conflict: EvidenceConflict, value: string) {
    update(conflict.field, value);
    setEvidenceConflicts((current)=>current.filter(item=>item!==conflict));
  }
  async function save() {
    if (!draft?.subject || !draft.grade) {
      setNotice("Add at least a subject and grade.");
      return;
    }
    if (!repository) {
      setNotice("Your collection is still loading.");
      return;
    }
    try {
      await repository.addCard(draft);
      setCards(await repository.getCards());
      closeAdd();
      setNotice("Card added to your collection.");
    } catch (error) {
      setNotice(
        error instanceof DuplicateCardError
          ? error.message
          : `Card not saved: ${error instanceof Error ? error.message : "Please try again."}`,
      );
    }
  }
  const authRedirectUrl = () => window.location.href.split(/[?#]/)[0];
  function switchAuthMode(mode: "signin" | "signup" | "forgot") {
    setAuthMode(mode);
    setAuthMessage("");
    setPassword("");
    setPasswordConfirm("");
  }
  async function submitAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) {
      setAuthMessage(
        "Cloud accounts are not configured yet. Your cards remain on this device.",
      );
      return;
    }
    setAuthBusy(true);
    setAuthMessage("");
    try {
      if (authMode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        closeAuth();
      } else if (authMode === "signup") {
        if (password !== passwordConfirm)
          throw new Error("Passwords do not match.");
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: authRedirectUrl() },
        });
        if (error) throw error;
        if (data.session) closeAuth();
        else
          setAuthMessage(
            "Check your email to confirm your account, then sign in.",
          );
      } else if (authMode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: authRedirectUrl(),
        });
        if (error) throw error;
        setAuthMessage(
          "If an account uses that email, a password-reset link is on its way.",
        );
      } else {
        if (password.length < 6)
          throw new Error("Use a password with at least 6 characters.");
        if (password !== passwordConfirm)
          throw new Error("Passwords do not match.");
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
        setPassword("");
        setPasswordConfirm("");
        setAuthMessage("Password updated. You can continue to your collection.");
        window.history.replaceState({}, document.title, authRedirectUrl());
      }
    } catch (error) {
      setAuthMessage(
        error instanceof Error ? error.message : "Authentication failed.",
      );
    } finally {
      setAuthBusy(false);
    }
  }
  async function signOut() {
    if (!supabase) return;
    const { error } = await supabase.auth.signOut();
    if (error) setNotice(`Sign out failed: ${error.message}`);
  }
  async function runImport() {
    if (!repository || !localImport) return;
    setImportBusy(true);
    try {
      const result = await importLocalCards(localImport.cards, repository);
      setImportResult(result);
      setCards(await repository.getCards());
      setLocalImport(null);
    } catch (error) {
      setNotice(
        `Import failed: ${error instanceof Error ? error.message : "Please try again."}`,
      );
    } finally {
      setImportBusy(false);
    }
  }

  return (
    <main>
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">
            <img className="brand-icon" src="./icons/icon-48.png" alt="" />
          </span>
          <div>
            <b>
              SLABBER<span>JAWS</span>
            </b>
            <small>GRADED COLLECTION</small>
          </div>
        </div>
        <div className="header-actions">
          <button
            className="primary desktop-add"
            onClick={(event) => openAddCard(event.currentTarget)}
          >
            <Plus /> Add card
          </button>
          <div className="account-menu" ref={accountMenuRef}>
            <button className="account-menu-toggle" aria-label={accountMenuOpen ? "Close account menu" : "Open account menu"} aria-haspopup="true" aria-expanded={accountMenuOpen} aria-controls="account-menu-panel" onClick={() => setAccountMenuOpen((open) => !open)}>
              <Menu aria-hidden="true" />
            </button>
            {accountMenuOpen && <div className="account-menu-panel" id="account-menu-panel" aria-label="Account actions">
              <button type="button" className="account-button diagnostics-toggle" role="switch" aria-label="Diagnostics" aria-checked={diagnosticsEnabled} onClick={() => updateDiagnosticsPreference(!diagnosticsEnabled)}>
                <span>Diagnostics</span><span className="diagnostics-toggle-state">{diagnosticsEnabled ? "On" : "Off"}</span>
              </button>
              {session ? <><p className="account-menu-identity"><UserRound aria-hidden="true" />{session.user.email}</p><button className="account-button" onClick={() => { setAccountMenuOpen(false); void signOut(); }}><LogOut aria-hidden="true" /> Sign out</button></> : <button className="account-button" onClick={(event) => { authOpenerRef.current = accountMenuRef.current?.querySelector(".account-menu-toggle") ?? event.currentTarget; setAccountMenuOpen(false); setAuthOpen(true); }}><LogIn aria-hidden="true" /> Account</button>}
            </div>}
          </div>
        </div>
      </header>
      <section className="shell">
        <div className="intro">
          <div>
            <p className="eyebrow">THE COLLECTION</p>
            <h1>
              Your graded cards,
              <br />
              <em>all in one place.</em>
            </h1>
          </div>
          <div className="count">
            <strong>{cards.length}</strong>
            <span>{session ? "CLOUD SLABS" : "DEVICE SLABS"}</span>
          </div>
        </div>
        {notice && (
          <div className="notice">
            {notice}
            <button aria-label="Dismiss" onClick={() => setNotice("")}>
              <X />
            </button>
          </div>
        )}
        {localImport && (
          <div className="import-banner">
            <div>
              <strong>Local cards found</strong>
              <p>
                We found {localImport.count} graded{" "}
                {localImport.count === 1 ? "card" : "cards"} saved on this
                device. Importing will not delete the local copy.
              </p>
            </div>
            <button
              className="primary"
              disabled={importBusy}
              onClick={runImport}
            >
              {importBusy ? "Importing…" : "Import to My Account"}
            </button>
          </div>
        )}
        {importResult && (
          <div className="notice">
            Import complete — Imported: {importResult.imported} · Already in
            collection: {importResult.duplicates} · Failed: {importResult.failed}
            <button aria-label="Dismiss" onClick={() => setImportResult(null)}>
              <X />
            </button>
          </div>
        )}
        <div className="toolbar">
          <label className="search">
            <Search />
            <input
              aria-label="Search collection"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search cards, sets, certs…"
            />
          </label>
          <div className="filters">
            <label>
              <SlidersHorizontal />
              <select
                value={grader}
                onChange={(e) => setGrader(e.target.value)}
              >
                <option>All graders</option>
                {graders.map((g) => (
                  <option key={g}>{g}</option>
                ))}
              </select>
              <ChevronDown />
            </label>
            <label>
              <select value={grade} onChange={(e) => setGrade(e.target.value)}>
                <option>All grades</option>
                {["10", "9.5", "9", "8.5", "8", "7"].map((g) => (
                  <option key={g}>{g}</option>
                ))}
              </select>
              <ChevronDown />
            </label>
            <label>
              <select value={sort} onChange={(e) => setSort(e.target.value)}>
                <option>Newest</option>
                <option>Oldest</option>
                <option>Grade high</option>
              </select>
              <ChevronDown />
            </label>
          </div>
        </div>
        <div className="result-head">
          <span>
            {loading
              ? "LOADING…"
              : `${filtered.length} ${filtered.length === 1 ? "SLAB" : "SLABS"}`}
          </span>
          <i />
        </div>
        {!loading &&
          (filtered.length ? (
            <div className="card-grid">
              {filtered.map((card) => (
                <button
                  className="slab-card"
                  key={card.id}
                  onClick={(event) => {
                    detailOpenerRef.current = event.currentTarget;
                    setDetail(card);
                  }}
                >
                  <div className="card-art">
                    <CardImage card={card} />
                    <span
                      className={`grader-pill ${card.grader.toLowerCase().replace(" ", "-")}`}
                    >
                      {card.grader}
                    </span>
                  </div>
                  <div className="card-copy">
                    <div className="grade-block">
                      <strong>{card.grade}</strong>
                      <span>GRADE</span>
                    </div>
                    <div className="card-name">
                      <h2>{card.subject}</h2>
                      <p>
                        {card.year} {card.brand} · {card.set}
                      </p>
                      <small>
                        {card.cardNumber} {card.variant && `· ${card.variant}`}
                      </small>
                    </div>
                    <code>{card.certNumber}</code>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="empty">
              <Archive />
              <h2>No slabs found</h2>
              <p>
                {session
                  ? "Add a graded card or import cards saved on this device."
                  : "Try clearing a filter or add a graded card."}
              </p>
            </div>
          ))}
      </section>
      <button className="floating-add" onClick={(event) => openAddCard(event.currentTarget)}>
        <Plus /> Add card
      </button>
      <footer className="site-footer">
        <a href={getContactEmailHref()}>Contact / feedback</a>
      </footer>
      {authOpen && (
        <div
          className="modal-backdrop"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeAuth();
          }}
        >
          <section className="modal auth-modal" role="dialog" aria-modal="true" aria-labelledby="auth-dialog-title">
            <button className="close" aria-label="Close account dialog" onClick={closeAuth}>
              <X />
            </button>
            <p className="eyebrow">SLABBERJAWS ACCOUNT</p>
            <h2 id="auth-dialog-title">
              {authMode === "signin" ? "Sign in" : authMode === "signup" ? "Create account" : authMode === "forgot" ? "Reset password" : "Set a new password"}
            </h2>
            <p className="muted">
              {authMode === "signin" ? "Open your cloud collection on this device." : authMode === "signup" ? "Save your collection across browsers and devices." : authMode === "forgot" ? "Enter your email and we’ll send a secure reset link." : "Choose a new password for your Slabberjaws account."}
            </p>
            {(authMode === "signin" || authMode === "signup") && <div className="auth-tabs">
              <button type="button" className={authMode === "signin" ? "active" : ""} onClick={() => switchAuthMode("signin")}>Sign In</button>
              <button type="button" className={authMode === "signup" ? "active" : ""} onClick={() => switchAuthMode("signup")}>Create Account</button>
            </div>}
            <form className="auth-form" onSubmit={submitAuth}>
              {authMode !== "reset" && <label className="field" htmlFor="account-email">
                Email
                <input id="account-email" name="email" type="email" required autoComplete="username" autoCapitalize="none" spellCheck={false} value={email} onChange={(e) => setEmail(e.target.value)} />
              </label>}
              {authMode !== "forgot" && <label className="field" htmlFor="account-password">
                {authMode === "reset" ? "New password" : "Password"}
                <input id="account-password" name={authMode === "signin" ? "password" : "new-password"} type="password" required minLength={6} autoComplete={authMode === "signin" ? "current-password" : "new-password"} value={password} onChange={(e) => setPassword(e.target.value)} />
              </label>}
              {(authMode === "signup" || authMode === "reset") && <label className="field" htmlFor="account-password-confirm">
                Confirm new password
                <input id="account-password-confirm" name="confirm-password" type="password" required minLength={6} autoComplete="new-password" value={passwordConfirm} onChange={(e) => setPasswordConfirm(e.target.value)} />
              </label>}
              {authMode === "signin" && <button type="button" className="text-button auth-forgot" onClick={() => switchAuthMode("forgot")}>Forgot password?</button>}
              {authMessage && <p role="status" className="form-message">{authMessage}</p>}
              <button type="submit" className="primary wide" disabled={authBusy || !password && authMode !== "forgot" || !email && authMode !== "reset"}>
                {authBusy ? "Please wait…" : authMode === "signin" ? "Sign In" : authMode === "signup" ? "Create Account" : authMode === "forgot" ? "Send reset email" : "Update password"}
              </button>
            </form>
            {authMode === "forgot" && <button type="button" className="text-button" onClick={() => switchAuthMode("signin")}>Back to Sign In</button>}
            {authMode === "reset" && <button type="button" className="text-button" onClick={() => switchAuthMode("forgot")}>Request another reset email</button>}
            {authMode !== "reset" && <button type="button" className="text-button" onClick={closeAuth}>Continue on This Device</button>}
            {!isSupabaseConfigured && (
              <p className="configuration-note">
                Cloud accounts are unavailable until Supabase is configured.
              </p>
            )}
          </section>
        </div>
      )}
      {addOpen && (
        <div
          className="modal-backdrop"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeAdd();
          }}
        >
          <section className="modal add-modal" key={addSessionId} role="dialog" aria-modal="true" aria-labelledby="add-dialog-title">
            <button className="close" aria-label="Close Add Card dialog" onClick={() => closeAdd()}>
              <X />
            </button>
            <p className="eyebrow">NEW SLAB</p>
            {diagnosticsEnabled && <p className="diagnostics-active" data-build-id={buildId} role="status">Diagnostics Active · build {buildId.slice(0, 12)}</p>}
            <h2 id="add-dialog-title">
              {step === "manual"
                ? "Enter card details"
                : step === "preview"
                  ? "Verify card"
                  : step === "scan"
                    ? "Scan slab"
                    : step === "photos"
                      ? "Photograph slab"
                    : "Add to your vault"}
            </h2>
            {step === "scan" && (
              <ScanEntry
                graders={graders}
                diagnosticsEnabled={diagnosticsEnabled}
                initialGrader={scanReturnToManual ? draft?.grader : lookupGraderExplicit ? lookupGrader : undefined}
                onCancel={() => { setStep(scanReturnToManual ? "manual" : "lookup"); setScanReturnToManual(false); }}
                onManual={(value, selected) => {
                  if (value) setCert(value);
                  if (selected) { setLookupGrader(selected); setLookupGraderExplicit(true); }
                  if(scanReturnToManual&&draft){
                    const patch:Partial<Card>={...(value?{certNumber:value}:{}),...(selected?{grader:selected}:{})};
                    const sources:CardEvidenceSources={...(value?{certNumber:"manual" as const}:{}),...(selected?{grader:"manual" as const}:{})};
                    const merged=mergeCardEvidence(draft,evidenceSources,patch,sources);
                    setDraft(merged.card);setEvidenceSources(merged.sources);setEvidenceConflicts(merged.conflicts);setCert(merged.card.certNumber);
                  }
                  setStep(scanReturnToManual ? "manual" : "lookup");
                  setScanReturnToManual(false);
                }}
                onManualDetails={(selected, value, extra) => {
                  const base = draft ?? createManualCard(selected, value);
                  const incoming = {...createManualCard(selected,value), ...(extra?.certUrl?{certUrl:extra.certUrl}:{}), ...(extra?.grade?{grade:extra.grade}:{})};
                  const incomingSources:CardEvidenceSources={grader:"manual",certNumber:"scan",...(extra?.certUrl?{certUrl:"scan" as const}:{}),...(extra?.grade?{grade:"scan" as const}:{})};
                  const merged=mergeCardEvidence(base,draft?evidenceSources:{},incoming,incomingSources);
                  setLookupGrader(selected);
                  setLookupGraderExplicit(true);
                  setCert(merged.card.certNumber);
                  setDraft(merged.card);
                  setEvidenceSources(merged.sources);
                  setEvidenceConflicts(merged.conflicts);
                  setScanHandoffDiagnostic(extra?.scanDiagnostic??null);
                  setScanReturnToManual(false);
                  setStep("manual");
                }}
                onConfirm={(selected, value) => {
                  setStep("lookup");
                  void beginLookup({ grader: selected, certNumber: value });
                }}
              />
            )}
            {step === "photos" && (
              <PhotoEntry
                graders={graders}
                diagnosticsEnabled={diagnosticsEnabled}
                initialGrader={draft?.grader}
                initialFields={draft ? photoFieldsFromCard(draft) : undefined}
                onCancel={() => { setStep(photoReturnToManual ? "manual" : "lookup"); setPhotoReturnToManual(false); }}
                onManualDetails={(selected, fields: PhotoFields, fieldSources: PhotoFieldSources) => {
                  const base=draft??{...createManualCard(selected,fields.certNumber),certUrl:generalVerificationUrl(selected)};
                  const photo=photoEvidence(fields,selected,fieldSources);
                  const merged=mergeCardEvidence(base,draft?evidenceSources:{},photo.patch,photo.sources);
                  setLookupGrader(selected);
                  setLookupGraderExplicit(true);
                  setCert(merged.card.certNumber);
                  setDraft(merged.card);
                  setEvidenceSources(merged.sources);
                  setEvidenceConflicts(merged.conflicts);
                  setPhotoReturnToManual(false);
                  setStep("manual");
                }}
              />
            )}
            {step === "lookup" && (
              <>
                <button
                  className="account-button scan-launch"
                  disabled={looking}
                  onClick={() => setStep("scan")}
                >
                  Scan Slab
                </button>
                <button
                  className="account-button scan-launch"
                  disabled={looking}
                  onClick={() => setStep("photos")}
                >
                  Photograph Slab
                </button>
                <button
                  className="text-button"
                  onClick={() =>
                    document.getElementById("certification-entry")?.focus()
                  }
                >
                  Enter Cert Manually
                </button>
                <p className="muted">
                  Start with the grading company and certification number.
                </p>
                <label className="field">
                  Grading company
                  <select
                    value={lookupGrader}
                    onChange={(e) => { setLookupGrader(e.target.value as Grader); setLookupGraderExplicit(true); }}
                  >
                    {graders.map((g) => (
                      <option key={g}>{g}</option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  Certification number
                  <input
                    id="certification-entry"
                    value={cert}
                    onChange={(e) => setCert(e.target.value)}
                    placeholder="e.g. 00409451"
                    inputMode="numeric"
                  />
                </label>
                <button
                  className="primary wide"
                  disabled={looking || !cert.trim()}
                  onClick={() => void beginLookup()}
                >
                  {looking ? "Looking up…" : hasAutomaticLookup(lookupGrader) ? "Look up certificate" : "Continue to card details"}
                </button>
              </>
            )}
            {step === "preview" && draft && (
              <div className="lookup-preview">
                <div className="preview-image">
                  <CardImage card={draft} />
                </div>
                <div className="identity">
                  <span>
                    {draft.grader} · Grade {draft.grade}
                  </span>
                  <code>{draft.certNumber}</code>
                </div>
                <h3>{draft.subject}</h3>
                <p>
                  {draft.year} {draft.brand} · {draft.set} {draft.cardNumber}{" "}
                  {draft.variant}
                </p>
                <button className="primary wide" onClick={save}>
                  Add to collection
                </button>
                <button
                  className="text-button"
                  onClick={() => setStep("lookup")}
                >
                  <ArrowLeft /> Not this card
                </button>
              </div>
            )}
            {step === "failed" && (
              <div className="lookup-failed">
                <div className="status-icon">!</div>
                <h3>We couldn’t automatically retrieve this certification.</h3>
                <p>
                  {lookupMessage ||
                    "The grader may block automated access or the lookup service may be unavailable."}{" "}
                  Nothing has been added yet.
                </p>
                <button className="primary wide" onClick={beginManual}>
                  Enter manually
                </button>
                <button
                  className="text-button"
                  onClick={() => setStep("lookup")}
                >
                  <ArrowLeft /> Try another certificate
                </button>
              </div>
            )}
            {step === "manual" && draft && (
              <>
                <div className="identity">
                  <span>{draft.grader}</span>
                  <code>{draft.certNumber}</code>
                </div>
                {diagnosticsEnabled && (scanHandoffDiagnostic || evidenceSources.certNumber === "scan" || evidenceSources.grade === "scan" || evidenceSources.certUrl === "scan") && (
                  <details className="scan-payload-diagnostics" open>
                    <summary>Scan evidence applied to Add Card</summary>
                    <dl>
                      {scanHandoffDiagnostic&&<><dt>Accepted code source</dt><dd>{scanHandoffDiagnostic.source} · {scanHandoffDiagnostic.format}</dd><dt>Payload classification</dt><dd>{scanHandoffDiagnostic.classification}</dd><dt>Raw decoded payload</dt><dd><code>{scanHandoffDiagnostic.rawPayload}</code></dd></>}
                      <dt>Selected grader</dt><dd>{draft.grader}</dd>
                      {evidenceSources.certNumber === "scan" && <><dt>Certification number</dt><dd>{draft.certNumber}</dd></>}
                      {evidenceSources.grade === "scan" && <><dt>Grade candidate</dt><dd>{draft.grade}</dd></>}
                      {evidenceSources.certUrl === "scan" && <><dt>Verification URL</dt><dd><code>{draft.certUrl}</code></dd></>}
                      <dt>Values received by Add Card</dt><dd>Cert {draft.certNumber || 'blank'} · Grade {draft.grade || 'blank'} · URL {draft.certUrl || 'blank'}</dd>
                    </dl>
                  </details>
                )}
                <div className="manual-identification-actions">
                  <button className="account-button wide" onClick={() => { setPhotoReturnToManual(true); setStep("photos"); }}>Photograph slab to fill details</button>
                  <button className="account-button wide" onClick={() => { setScanReturnToManual(true); setStep("scan"); }}>Scan slab to add or confirm certification</button>
                </div>
                {evidenceConflicts.length>0&&<section className="evidence-conflicts" aria-label="Conflicting identification suggestions"><strong>Conflicting suggestions — review</strong>{evidenceConflicts.map((conflict,index)=><div key={`${String(conflict.field)}-${index}`}><span>{String(conflict.field)}: existing “{conflict.existing}” · new {conflict.incomingSource} “{conflict.incoming}”</span><button className="account-button" onClick={()=>chooseConflict(conflict,conflict.existing)}>Keep existing</button><button className="text-button" onClick={()=>chooseConflict(conflict,conflict.incoming)}>Use suggestion</button></div>)}</section>}
                <div className="manual-grid">
                  {(
                    [
                      ["certNumber", "Certification number"],
                      ["subject", "Subject / card name"],
                      ["grade", "Grade"],
                      ["year", "Year"],
                      ["brand", "Brand"],
                      ["set", "Set"],
                      ["cardNumber", "Card number"],
                      ["variant", "Variant"],
                      ["frontImageUrl", "Front image URL"],
                      ["backImageUrl", "Back image URL"],
                      ["certUrl", "Certification page URL"],
                    ] as [keyof Card, string][]
                  ).map(([key, label]) => (
                    <label
                      className={`field ${key.includes("Url") ? "full" : ""}`}
                      key={key}
                    >
                      {label}
                      <input
                        value={String(draft[key] ?? "")}
                        onChange={(e) => update(key, e.target.value)}
                      />
                    </label>
                  ))}
                </div>
                <button className="primary wide" onClick={save}>
                  Add to collection
                </button>
              </>
            )}
          </section>
        </div>
      )}
      {detail && (
        <div className="modal-backdrop">
          <section className="modal detail-modal" role="dialog" aria-modal="true" aria-labelledby="detail-dialog-title">
            <button className="close" aria-label="Close card details dialog" onClick={closeDetail}>
              <X />
            </button>
            <div className="detail-image">
              <CardImage card={detail} large />
            </div>
            <div className="detail-copy">
              <span className="grader-pill">{detail.grader}</span>
              <h2 id="detail-dialog-title">{detail.subject}</h2>
              <p>
                {detail.year} {detail.brand} · {detail.set} {detail.cardNumber}
              </p>
              <div className="big-grade">
                <strong>{detail.grade}</strong>
                <span>GRADE</span>
              </div>
              <dl>
                <div>
                  <dt>Certification</dt>
                  <dd>{detail.certNumber}</dd>
                </div>
                <div>
                  <dt>Variant</dt>
                  <dd>{detail.variant || "—"}</dd>
                </div>
                <div>
                  <dt>Population</dt>
                  <dd>{detail.population ?? "Not available"}</dd>
                </div>
                <div>
                  <dt>Entry</dt>
                  <dd>{detail.manual ? "Manual" : "Verified lookup"}</dd>
                </div>
                {Object.entries(detail.graderSpecific).map(([k, v]) => (
                  <div key={k}>
                    <dt>{k}</dt>
                    <dd>{String(v)}</dd>
                  </div>
                ))}
              </dl>
              {detail.certUrl && (
                <a
                  className="primary link"
                  target="_blank"
                  rel="noreferrer"
                  href={detail.certUrl}
                >
                  {certificationLinkLabel(detail.grader)} <ExternalLink />
                </a>
              )}
            </div>
          </section>
        </div>
      )}
    </main>
  );
}

