import type { ApplicantNameFields, SkdOutsideUkApplicant } from './types';

export function formatFullName(title: string, name: string): string {
  const trimmedTitle = title.trim();
  const trimmedName = name.trim();
  return trimmedTitle ? `${trimmedTitle} ${trimmedName}` : trimmedName;
}

export function joinWithOxfordComma(items: string[]): string {
  if (items.length === 0) {
    return '';
  }
  if (items.length === 1) {
    return items[0];
  }
  if (items.length === 2) {
    return `${items[0]} and ${items[1]}`;
  }
  return `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1]}`;
}

export function formatApplicantsList(applicants: ApplicantNameFields[]): string {
  return joinWithOxfordComma(
    applicants.map((applicant) => formatFullName(applicant.title, applicant.name)),
  );
}

function splitApplicationRef(ref: string): { base: string; suffix: string | null } {
  const trimmed = ref.trim();
  const slashIndex = trimmed.lastIndexOf('/');
  if (slashIndex === -1) {
    return { base: trimmed, suffix: null };
  }

  return {
    base: trimmed.slice(0, slashIndex),
    suffix: trimmed.slice(slashIndex + 1),
  };
}

/** SKW+dep style: `1212-0001-xxxx-xxxx/00, and 01` */
export function formatApplicationRefsSkwDep(refs: string[]): string {
  if (refs.length === 0) {
    return '';
  }
  if (refs.length === 1) {
    return refs[0].trim();
  }

  const parsed = refs.map(splitApplicationRef);
  const base = parsed[0]?.base ?? refs[0].trim();
  const suffixes = parsed
    .map((item, index) => item.suffix ?? (index === 0 ? null : item.base))
    .filter((suffix): suffix is string => Boolean(suffix));

  if (suffixes.length === 0) {
    return joinWithOxfordComma(refs.map((ref) => ref.trim()));
  }

  const formattedSuffixes = suffixes.map((suffix, index) =>
    index === 0 ? `${base}/${suffix}` : suffix,
  );

  if (formattedSuffixes.length === 1) {
    return formattedSuffixes[0];
  }

  const last = formattedSuffixes[formattedSuffixes.length - 1];
  const initial = formattedSuffixes.slice(0, -1).join(', ');
  return `${initial}, and ${last}`;
}

/** NAT style: `1212-0001-xxxx-xxxx/00, /01, /02 & /03` */
export function formatApplicationRefsNat(refs: string[]): string {
  if (refs.length === 0) {
    return '';
  }
  if (refs.length === 1) {
    return refs[0].trim();
  }

  const parts = refs.map((ref, index) => {
    const { base, suffix } = splitApplicationRef(ref);
    if (index === 0) {
      return suffix ? `${base}/${suffix}` : base;
    }
    return suffix ? `/${suffix}` : ref.trim();
  });

  if (parts.length === 2) {
    return `${parts[0]}, ${parts[1]}`;
  }

  const last = parts[parts.length - 1];
  const initial = parts.slice(0, -1).join(', ');
  return `${initial} & ${last}`;
}

export function formatApplicationRefsParental(refs: string[]): string {
  if (refs.length === 0) {
    return '';
  }

  const formatted = refs.map((ref) => {
    const trimmed = ref.trim();
    return trimmed.startsWith('UAN:') ? trimmed : `UAN: ${trimmed}`;
  });

  return formatted.join(', ');
}

export function formatApplicantGwfLines(applicants: SkdOutsideUkApplicant[]): string {
  if (applicants.length === 0) {
    return '';
  }
  if (applicants.length === 1) {
    return `Applicant 1: ${applicants[0].gwf.trim()}`;
  }

  const parts = applicants.map(
    (applicant, index) => `Applicant ${index + 1}: ${applicant.gwf.trim()}`,
  );

  if (parts.length === 2) {
    return `${parts[0]} and ${parts[1]}`;
  }

  const last = parts[parts.length - 1];
  const initial = parts.slice(0, -1).join(', ');
  return `${initial}, and ${last}`;
}

export function formatApplicantUanLines(applicants: SkdOutsideUkApplicant[]): string {
  if (applicants.length === 0) {
    return '';
  }

  const uans = applicants.map((applicant) => applicant.uan.trim());
  if (uans.length === 1) {
    return `UAN: ${uans[0]}`;
  }
  if (uans.length === 2) {
    return `UAN: ${uans[0]} and ${uans[1]}`;
  }

  const last = uans[uans.length - 1];
  const initial = uans.slice(0, -1).join(', ');
  return `UAN: ${initial}, and ${last}`;
}

export function formatSkdApplicantsNamesList(applicants: ApplicantNameFields[]): string {
  if (applicants.length === 0) {
    return '';
  }
  if (applicants.length === 1) {
    return formatFullName(applicants[0].title, applicants[0].name);
  }

  const first = formatFullName(applicants[0].title, applicants[0].name);
  const second = formatFullName(applicants[1].title, applicants[1].name);
  return `${first} and her daughter ${second}`;
}

export function defaultPronounsFromTitle(title: string): {
  object: 'him' | 'her';
  possessive: 'his' | 'her';
} {
  const normalized = title.trim().toLowerCase();
  if (normalized === 'mr' || normalized === 'master') {
    return { object: 'him', possessive: 'his' };
  }
  return { object: 'her', possessive: 'her' };
}

export function relationshipPhrase(relationship: string): string {
  const normalized = relationship.trim().toLowerCase();
  if (normalized === 'wife') {
    return 'her wife';
  }
  if (normalized === 'husband') {
    return 'her husband';
  }
  if (normalized === 'spouse') {
    return 'her spouse';
  }
  if (normalized === 'partner') {
    return 'her partner';
  }
  if (normalized) {
    return `her ${normalized}`;
  }
  return 'her dependant';
}

export function partnerRelationshipWord(): string {
  return 'partner';
}

export function buildExtensionParagraph(input: {
  isExtension: boolean;
  primaryApplicantFull: string;
  dependantRelationshipPhrase: string;
  dependantFull: string;
  dependantPossessive: 'his' | 'her';
}): string {
  if (!input.isExtension) {
    return '';
  }

  return `The applicant is currently in the United Kingdom on a skilled worker visa and ${input.dependantRelationshipPhrase} ${input.dependantFull} as dependant and had recently received a Certificate of Sponsorship for extension from ${input.dependantPossessive} sponsoring employer. The applicants now wish to apply to extend their permission.\n`;
}

export function buildSponsorDependantClause(
  sponsorName: string,
  sponsorRelationship: string,
): string {
  const relationship = sponsorRelationship.trim().toLowerCase();
  return `her ${relationship}, ${sponsorName.trim()}`;
}

export function buildNatRefSubject(leadApplicantFull: string): string {
  return `Naturalisation/Registration as a British Citizen application – ${leadApplicantFull} and children`;
}

export function buildParentalRefLine(childName: string): string {
  return `Consent for ${childName.trim()} to apply for skilled worker dependant visa and confirmation of our parental responsibility.`;
}

export function childPronounObject(): string {
  return 'her';
}
