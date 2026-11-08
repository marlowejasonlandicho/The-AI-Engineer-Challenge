import CoachChat from "./components/CoachChat";

/**
 * The page itself stays a Server Component. All typing, history, and
 * requests live in CoachChat, which is the client boundary.
 */
export default function Home() {
  return <CoachChat />;
}
