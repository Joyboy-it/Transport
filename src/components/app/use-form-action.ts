"use client";

import { useActionState, useEffect, useRef, useTransition, type FormEvent } from "react";

type State = { ok: boolean; message?: string; fieldErrors?: Record<string, string> } | null;

/**
 * Like useActionState, but keeps what the user typed when the server rejects the form.
 * React resets uncontrolled forms after every `action={...}` submission.
 */
export function useFormAction(
  serverAction: (prev: State, formData: FormData) => Promise<State>,
  options: { resetOnSuccess?: boolean } = {},
) {
  const [state, dispatch, pending] = useActionState<State, FormData>(serverAction, null);
  const [, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const { resetOnSuccess } = options;

  useEffect(() => {
    if (resetOnSuccess && state?.ok) formRef.current?.reset();
  }, [state, resetOnSuccess]);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const submitter = (event.nativeEvent as SubmitEvent).submitter;
    const formData = new FormData(event.currentTarget, submitter);
    startTransition(() => dispatch(formData));
  }

  return { state, onSubmit, pending, formRef };
}
