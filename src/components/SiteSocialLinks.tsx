'use client';

import { useEffect, useState } from 'react';

type Profile = { id: string; label: string; profileUrl: string };

export function SiteSocialLinks({ className = '' }: { className?: string }) {
  const [profiles, setProfiles] = useState<Profile[]>([]);

  useEffect(() => {
    fetch('/api/social/profiles')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data.profiles)) setProfiles(data.profiles);
      })
      .catch(() => undefined);
  }, []);

  if (!profiles.length) return null;

  return (
    <ul className={className}>
      {profiles.map((profile) => (
        <li key={profile.id}>
          <a
            href={profile.profileUrl}
            target="_blank"
            rel="noreferrer"
            className="transition hover:text-white"
          >
            {profile.label}
          </a>
        </li>
      ))}
    </ul>
  );
}
