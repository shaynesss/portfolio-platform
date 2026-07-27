import { useEffect, useRef, useState } from "react";
import CathedralScene from "@/components/CathedralScene";
import AboutSection from "@/components/AboutSection";
import AIWorkflowSection from "@/components/AIWorkflowSection";
import RoseWindowProjectsOverlay from "@/components/RoseWindowProjectsOverlay";
import { useCathedralJourney } from "@/hooks/useCathedralJourney";
import { useCardExpand } from "@/hooks/useCardExpand";
import { useGlobalTapDispatch } from "@/hooks/useGlobalTapDispatch";
import { hingeToNaveT, journeyContentT } from "@/lib/cathedralWaypoints";
import { useProjects } from "@/hooks/useProjects";
import {
  getAboutContent,
  getAiWorkflowContent,
  type AboutContent,
  type AiWorkflowContent,
} from "@/lib/api";

// Scroll room for the whole post-gate journey (hinge->nave transition,
// nave hold, nave->rose-window transition, rose-window hold). Large on
// purpose — real physical scroll distance is what actually forces the
// turn-around onto the rose window to take a while regardless of how
// fast someone scrolls; a bigger fraction of a short journey still
// rushes past on a fast scroll. Bumped modestly (not doubled) alongside
// the longer hinge->nave walk in cathedralWaypoints.ts, proportionate
// to that distance increase rather than a blanket "more scroll."
const JOURNEY_VH = 680;

// How long the click-triggered gate->hinge camera push takes — matches
// CathedralScene's own GATE_PUSH_DURATION (2.6s) exactly, since that's
// a fixed-duration tween now, not an asymptotic ease with no true end.
const GATE_OPEN_SETTLE_MS = 2600;

// The rose window always has 6 wedge panes regardless of how many
// projects are actually populated (see roseWindowAsset.ts) — expand
// state is sized to the fixed slot count, not projects.length, so it
// doesn't need to resize once the async project fetch resolves.
const PROJECT_SLOT_COUNT = 6;

function App() {
  const { projects } = useProjects();
  const [about, setAbout] = useState<AboutContent | null>(null);
  const [aiWorkflow, setAiWorkflow] = useState<AiWorkflowContent | null>(null);
  const [gateOpened, setGateOpened] = useState(false);
  // Distinct from gateOpened: the click fires an unscrollable camera
  // move to the hinge first (see GATE_OPEN_SETTLE_MS); only once that's
  // settled does scroll unlock and About appear — the "then that's
  // where the about assets come in" beat is sequential, not immediate.
  const [journeyUnlocked, setJourneyUnlocked] = useState(false);

  const journeyContainerRef = useRef<HTMLDivElement>(null);
  const journeyRaw = useCathedralJourney(journeyContainerRef, journeyUnlocked);

  const {
    progress: projectProgress,
    setHoveredIndex: setProjectHovered,
    setInteractiveIndex: setProjectInteractive,
    toggleExpand: toggleProjectExpand,
    registerInnerScroll: registerProjectInnerScroll,
  } = useCardExpand(PROJECT_SLOT_COUNT);

  // Sitewide tap-to-click restore for touch devices — see the hook's
  // own comment for why this went missing (ScrollScenes retired,
  // nothing replaced its tap-dispatch half) and what it fixes (the
  // Noctis card and these rose-window panes both need it).
  useGlobalTapDispatch();

  useEffect(() => {
    getAboutContent().then(setAbout).catch(console.error);
    getAiWorkflowContent().then(setAiWorkflow).catch(console.error);
  }, []);

  useEffect(() => {
    if (!gateOpened) return;
    const timer = setTimeout(() => setJourneyUnlocked(true), GATE_OPEN_SETTLE_MS);
    return () => clearTimeout(timer);
  }, [gateOpened]);

  // A fully expanded pane is a modal moment, not just a card mid-animation
  // — matches toggleExpand's own 0.98 "is this basically done" threshold in
  // useCardExpand so the lock engages exactly when a collapse-tap would
  // otherwise re-open it. isProjectExpanded gates both the scroll lock
  // below and CathedralScene's own hover/click raycasting.
  const expandedProjectIndex = projectProgress.findIndex((p) => p >= 0.98);
  const isProjectExpanded = expandedProjectIndex !== -1;

  // Scroll is inert until the gate's hinge-push has settled, and re-locked
  // while a pane is fully expanded — otherwise scrolling behind an open
  // card would drag the camera (and the expanded pane with it) while the
  // reader is still on it.
  useEffect(() => {
    document.body.style.overflow =
      journeyUnlocked && !isProjectExpanded ? "" : "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [journeyUnlocked, isProjectExpanded]);

  // naveEntryT: 0 at the hinge, 1 once arrived at the nave — drives the
  // About <-> How-I-Work crossfade as a complementary pair so they're
  // never both opaque at once. contentT then separately fades How I
  // Work out as the camera turns to the rose window (the panes
  // themselves live in the persistent 3D scene and don't need their own
  // section-level crossfade — they're simply not in frame until the
  // camera turns to face them).
  const naveEntryT = journeyUnlocked ? hingeToNaveT(journeyRaw) : 0;
  const aboutOpacity = journeyUnlocked ? 1 - naveEntryT : 0;
  const contentT = journeyContentT(journeyRaw);
  const howItWorkOpacity = naveEntryT * (1 - contentT);

  return (
    <div className="relative text-foreground">
      <CathedralScene
        gateOpened={gateOpened}
        journeyRaw={journeyRaw}
        onGateClick={() => setGateOpened(true)}
        projects={projects}
        projectExpandProgress={projectProgress}
        onProjectHover={setProjectHovered}
        onProjectToggleExpand={toggleProjectExpand}
        blockInteraction={isProjectExpanded}
      />

      {journeyUnlocked && about && (
        <div
          className="fixed inset-0 z-10"
          style={{
            opacity: aboutOpacity,
            pointerEvents: aboutOpacity < 0.05 ? "none" : "auto",
          }}
        >
          <AboutSection content={about} visible={aboutOpacity > 0.5} />
        </div>
      )}

      {gateOpened && (
        // pointer-events-none on BOTH this outer spacer and the sticky
        // child below is load-bearing, not decoration — confirmed via
        // document.elementFromPoint that clicks meant for the canvas
        // were landing on this div. pointer-events:none on a child only
        // makes that child transparent to hit-testing; the browser then
        // resumes testing whatever box still covers that point, which
        // is THIS outer element (a real box for the whole 680vh scroll
        // span) — not the canvas, since that's an unrelated sibling
        // elsewhere in the tree, not "behind" this element in any stack
        // the browser continues into automatically. Both had to be
        // none for clicks to actually fall through to the canvas.
        <div
          ref={journeyContainerRef}
          style={{ height: `${JOURNEY_VH}vh` }}
          className="relative pointer-events-none"
        >
          <div className="sticky top-0 h-screen overflow-hidden pointer-events-none">
            {aiWorkflow && (
              <div
                className="absolute inset-0"
                style={{
                  opacity: howItWorkOpacity,
                  pointerEvents: howItWorkOpacity < 0.05 ? "none" : "auto",
                }}
              >
                <AIWorkflowSection content={aiWorkflow} active={journeyUnlocked} />
              </div>
            )}
          </div>
        </div>
      )}

      {gateOpened && (
        <RoseWindowProjectsOverlay
          projects={projects}
          progress={projectProgress}
          setHoveredIndex={setProjectHovered}
          setInteractiveIndex={setProjectInteractive}
          registerInnerScroll={registerProjectInnerScroll}
          toggleExpand={toggleProjectExpand}
        />
      )}
    </div>
  );
}

export default App;
