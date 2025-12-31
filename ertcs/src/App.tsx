import { TimelineProvider } from './context/TimelineContext';
import { AppLayout } from './components/layout/AppLayout';
import { TimelineCanvas } from './components/timeline/TimelineCanvas';
import { TimelineTrack } from './components/timeline/TimelineTrack';
import './App.css';

function App() {
  return (
    <TimelineProvider>
      <AppLayout>
        <TimelineCanvas>
          <TimelineTrack />
        </TimelineCanvas>
      </AppLayout>
    </TimelineProvider>
  );
}

export default App;
