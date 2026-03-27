import * as React from "react";

const TOAST_LIMIT = 3;
const TOAST_REMOVE_DELAY = 3000;

let toastCount = 0;
const toastTimeouts = new Map();
const listeners = [];
let memoryState = { toasts: [] };

function dispatch(action) {
  memoryState = reducer(memoryState, action);
  listeners.forEach((listener) => listener(memoryState));
}

function reducer(state, action) {
  switch (action.type) {
    case "ADD_TOAST":
      return { ...state, toasts: [action.toast, ...state.toasts].slice(0, TOAST_LIMIT) };
    case "UPDATE_TOAST":
      return { ...state, toasts: state.toasts.map((t) => t.id === action.toast.id ? { ...t, ...action.toast } : t) };
    case "DISMISS_TOAST": {
      const { toastId } = action;
      if (toastId) {
        if (!toastTimeouts.has(toastId)) {
          const timeout = setTimeout(() => {
            toastTimeouts.delete(toastId);
            dispatch({ type: "REMOVE_TOAST", toastId });
          }, TOAST_REMOVE_DELAY);
          toastTimeouts.set(toastId, timeout);
        }
      } else {
        state.toasts.forEach((t) => {
          if (!toastTimeouts.has(t.id)) {
            const timeout = setTimeout(() => {
              toastTimeouts.delete(t.id);
              dispatch({ type: "REMOVE_TOAST", toastId: t.id });
            }, TOAST_REMOVE_DELAY);
            toastTimeouts.set(t.id, timeout);
          }
        });
      }
      return { ...state, toasts: state.toasts.map((t) => (toastId === undefined || t.id === toastId) ? { ...t, open: false } : t) };
    }
    case "REMOVE_TOAST":
      return { ...state, toasts: state.toasts.filter((t) => t.id !== action.toastId) };
    default:
      return state;
  }
}

function toast({ ...props }) {
  const id = String(++toastCount);
  const dismiss = () => dispatch({ type: "DISMISS_TOAST", toastId: id });
  dispatch({
    type: "ADD_TOAST",
    toast: { ...props, id, open: true, onOpenChange: (open) => { if (!open) dismiss(); } },
  });
  setTimeout(dismiss, TOAST_REMOVE_DELAY);
  return { id, dismiss };
}

function useToast() {
  const [state, setState] = React.useState(memoryState);
  React.useEffect(() => {
    listeners.push(setState);
    return () => {
      const index = listeners.indexOf(setState);
      if (index > -1) listeners.splice(index, 1);
    };
  }, [state]);
  return {
    ...state,
    toast,
    dismiss: (toastId) => dispatch({ type: "DISMISS_TOAST", toastId }),
  };
}

export { useToast, toast };
