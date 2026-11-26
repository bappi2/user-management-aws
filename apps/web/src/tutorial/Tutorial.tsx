import { useState } from 'react';
import { updateTutorialProgress } from '../api';
import { useMe } from '../me/meContext';
import { CURRENT_TUTORIAL_VERSION, TUTORIAL_STEPS } from './steps';

type Props = {
  replay: boolean;              // "Replay tutorial" clicked
  onReplayDone: () => void;
};

/** Shows the tour when it's due (stored version < current) or on replay. Saving happens only when it was due. */
export function Tutorial({ replay, onReplayDone }: Props) {
  const { me, reload } = useMe();
  const [step, setStep] = useState(0);
  const [dismissed, setDismissed] = useState(false);

  const due = me !== null && me.tutorialVersion < CURRENT_TUTORIAL_VERSION && !dismissed;
  if (!due && !replay) return null;

  const last = step === TUTORIAL_STEPS.length - 1;
  const { title, body } = TUTORIAL_STEPS[step];

  async function close() {
    setStep(0);
    if (replay) onReplayDone();
    if (due) {
      setDismissed(true);                                  // hide now, even if the save fails
      try {
        await updateTutorialProgress(CURRENT_TUTORIAL_VERSION);
        await reload();                                    // me.tutorialVersion is now current
      } catch {
        // not saved → the tour shows again on the next visit; harmless
      }
    }
  }

  return (
    <div className="tutorial-backdrop">
      <div className="tutorial" role="dialog" aria-modal="true" aria-labelledby="tutorial-title">
        <p className="hint">Step {step + 1} of {TUTORIAL_STEPS.length}</p>
        <h3 id="tutorial-title">{title}</h3>
        <p>{body}</p>
        <div className="tutorial-actions">
          {!last && <button type="button" className="tutorial-skip" onClick={() => void close()}>Skip</button>}
          {step > 0 && <button type="button" onClick={() => setStep(step - 1)}>Back</button>}
          {last
            ? <button type="button" className="tutorial-next" onClick={() => void close()}>Done</button>
            : <button type="button" className="tutorial-next" onClick={() => setStep(step + 1)}>Next</button>}
        </div>
      </div>
    </div>
  );
}
