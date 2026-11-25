import { useEffect, useState } from 'react';
import api from '../services/api';

function AdminActivityPage() {
  const [activity, setActivity] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    api.get('/admin/activity')
      .then(({ data }) => {
        if (active) setActivity(data.data.activity);
      })
      .catch((requestError) => {
        if (active) setError(requestError.response?.data?.message || 'Activity could not be loaded.');
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <section className="admin-page">
      <div className="admin-page-heading"><div><p className="eyebrow">STORE HISTORY</p><h1>Activity</h1></div></div>
      {error && <p className="admin-alert" role="alert">{error}</p>}
      {isLoading ? <p className="admin-state" role="status">Loading activity...</p> : activity.length ? (
        <ol className="admin-activity-timeline">
          {activity.map((entry) => (
            <li key={entry._id}>
              <span className="admin-activity-dot" aria-hidden="true" />
              <div><strong>{entry.description}</strong><p>{entry.actor?.name || entry.actorName} · {new Date(entry.createdAt).toLocaleString()}</p></div>
            </li>
          ))}
        </ol>
      ) : <p className="admin-empty">No activity has been recorded yet.</p>}
    </section>
  );
}

export default AdminActivityPage;
