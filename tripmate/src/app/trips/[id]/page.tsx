import React from 'react';
import { TripWorkspaceClient } from './TripWorkspaceClient';
import { INITIAL_TRIPS } from '@/data/mockTrips';

export async function generateStaticParams() {
  return INITIAL_TRIPS.map((t) => ({ id: t.id }));
}

export default async function TripWorkspacePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <TripWorkspaceClient tripId={id} />;
}
