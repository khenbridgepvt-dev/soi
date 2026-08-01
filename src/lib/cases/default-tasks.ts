/**
 * The fixed 13-task lifecycle created on case acceptance
 * (SRS_v4_MVP.md §3.2, database_schema.md T5 seed data, ADR-0002).
 *
 * `public.accept_lead()` inserts these rows inside the acceptance transaction;
 * this list is the display/test mirror of that seed data. The two must stay in
 * step — `tests/integration/accept-lead-rpc.test.ts` asserts they match.
 */

export type DefaultTask = {
  sequence: number;
  name: string;
  abbreviation: string;
  description: string;
};

export const DEFAULT_TASKS: readonly DefaultTask[] = [
  {
    sequence: 1,
    name: 'CCL (Client Care Letter)',
    abbreviation: 'CCL',
    description: 'Draft and dispatch the Client Care Letter to the client.',
  },
  {
    sequence: 2,
    name: 'LOA (Letter of Authority)',
    abbreviation: 'LOA',
    description: 'Draft and dispatch the Letter of Authority to the client.',
  },
  {
    sequence: 3,
    name: 'Send Google Form',
    abbreviation: 'Form Send',
    description: 'Send the intake form (Google Form) to the client for completion.',
  },
  {
    sequence: 4,
    name: 'Google Form Received',
    abbreviation: 'Form Recv',
    description: 'Confirm receipt of the completed intake form from the client.',
  },
  {
    sequence: 5,
    name: 'Application Preparation',
    abbreviation: 'App',
    description:
      'Core casework: drafting, compiling information, and preparing the application.',
  },
  {
    sequence: 6,
    name: 'Pending Detail Collection',
    abbreviation: 'Detail',
    description:
      'Follow up with the client for any missing information required for the application.',
  },
  {
    sequence: 7,
    name: 'Review by Client',
    abbreviation: 'Client Rev',
    description: 'Send the prepared application to the client for review and approval.',
  },
  {
    sequence: 8,
    name: 'Review by Senior',
    abbreviation: 'Senior Rev',
    description: 'A senior caseworker reviews the application and records the outcome.',
  },
  {
    sequence: 9,
    name: 'Disclaimer Email Sent',
    abbreviation: 'Disclaimer',
    description: 'Dispatch the disclaimer email to the client after senior approval.',
  },
  {
    sequence: 10,
    name: 'Application Payment',
    abbreviation: 'Payment',
    description: 'Collect the application payment from the client.',
  },
  {
    sequence: 11,
    name: 'Appointment Booking',
    abbreviation: 'Appt Book',
    description: 'Book the required appointment (e.g. biometrics).',
  },
  {
    sequence: 12,
    name: 'Document Collection',
    abbreviation: 'Doc Collect',
    description: 'The client submits all required documents as requested by staff.',
  },
  {
    sequence: 13,
    name: 'Document Review & Upload',
    abbreviation: 'DU',
    description:
      'Review received documents, organise file structures, and upload to the external platform.',
  },
] as const;

export const DEFAULT_TASK_COUNT = DEFAULT_TASKS.length;
