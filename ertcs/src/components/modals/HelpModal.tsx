import { Modal } from './Modal';
import './HelpModal.css';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function HelpModal({ isOpen, onClose }: HelpModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Help" width={600}>
      <div className="help-content">
        <section className="help-section">
          <h3>About This Tool</h3>
          <p>
            The Elden Ring Timeline Constraint Solver helps you build and visualize
            theories about the chronological order of events in Elden Ring. Define
            temporal relationships between events, and the constraint solver will
            position them on the timeline.
          </p>
        </section>

        <section className="help-section">
          <h3>Getting Started</h3>
          <ol>
            <li>Add events using the <strong>+ Event</strong> button (for instant moments) or <strong>+ Era</strong> (for periods of time)</li>
            <li>Click an event once to select it, click again to edit its details</li>
            <li>Create relationships using the <strong>+ Relationship</strong> button</li>
            <li>The timeline will automatically reposition based on your constraints</li>
          </ol>
        </section>

        <section className="help-section">
          <h3>Allen's Interval Relations</h3>
          <p>
            Relationships are based on Allen's Interval Algebra, which provides 13 ways
            to describe how two time intervals relate:
          </p>
          <div className="allen-relations">
            <div className="allen-group">
              <h4>Basic Relations</h4>
              <dl>
                <dt>Before / After</dt>
                <dd>A ends before B starts (or vice versa)</dd>
                <dt>Meets / Met-by</dt>
                <dd>A ends exactly when B starts (or vice versa)</dd>
                <dt>Equals</dt>
                <dd>A and B have identical start and end times</dd>
              </dl>
            </div>
            <div className="allen-group">
              <h4>Overlap Relations</h4>
              <dl>
                <dt>Overlaps / Overlapped-by</dt>
                <dd>A starts before B, but A ends during B (or vice versa)</dd>
                <dt>During / Contains</dt>
                <dd>A is entirely within B (or vice versa)</dd>
              </dl>
            </div>
            <div className="allen-group">
              <h4>Boundary Relations</h4>
              <dl>
                <dt>Starts / Started-by</dt>
                <dd>A and B start together, but one ends first</dd>
                <dt>Finishes / Finished-by</dt>
                <dd>A and B end together, but one started later</dd>
              </dl>
            </div>
          </div>
        </section>

        <section className="help-section">
          <h3>Confidence Levels</h3>
          <p>Each relationship has a confidence level that affects how the solver handles conflicts:</p>
          <ul>
            <li><strong>Explicit</strong> — Directly stated in-game. Highest priority.</li>
            <li><strong>Inferred</strong> — Reasonable inference from evidence.</li>
            <li><strong>Speculation</strong> — Uncertain theory. Lowest priority, relaxed first if conflicts arise.</li>
          </ul>
        </section>

        <section className="help-section">
          <h3>Keyboard Shortcuts</h3>
          <table className="shortcuts-table">
            <tbody>
              <tr>
                <td><kbd>Ctrl</kbd> + <kbd>Z</kbd></td>
                <td>Undo</td>
              </tr>
              <tr>
                <td><kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>Z</kbd></td>
                <td>Redo</td>
              </tr>
              <tr>
                <td><kbd>Escape</kbd></td>
                <td>Close modal / Deselect</td>
              </tr>
              <tr>
                <td><kbd>Delete</kbd></td>
                <td>Delete selected event</td>
              </tr>
            </tbody>
          </table>
        </section>

        <section className="help-section">
          <h3>Navigation</h3>
          <ul>
            <li><strong>Pan:</strong> Click and drag the timeline</li>
            <li><strong>Zoom:</strong> Scroll wheel or pinch gesture</li>
          </ul>
        </section>
      </div>
    </Modal>
  );
}
