'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import {
  setEnquiryStatus,
  deleteEnquiry,
  ENQUIRY_STATUSES,
  type EnquiryStatus,
} from '@/lib/enquiries';
import { requireSession } from '../actions';

/** Every action re-checks the session — middleware only proves a cookie exists. */

export async function updateEnquiryStatus(formData: FormData): Promise<void> {
  await requireSession();

  const id = String(formData.get('id') ?? '');
  const status = String(formData.get('status') ?? '');
  if (!id || !ENQUIRY_STATUSES.includes(status as EnquiryStatus)) return;

  await setEnquiryStatus(id, status as EnquiryStatus);
  revalidatePath('/dashboard/enquiries');
  revalidatePath(`/dashboard/enquiries/${id}`);
}

export async function removeEnquiry(formData: FormData): Promise<void> {
  await requireSession();

  const id = String(formData.get('id') ?? '');
  if (!id) return;

  await deleteEnquiry(id);
  revalidatePath('/dashboard/enquiries');
  redirect('/dashboard/enquiries');
}
