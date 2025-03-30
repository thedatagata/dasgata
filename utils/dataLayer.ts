// utils/dataLayer.ts
import { config } from "./config.ts";

// Type definition for the dataLayer
declare global {
  interface Window {
    dataLayer: any[];
  }
}

/**
 * Push an event to the dataLayer
 */
export function pushEvent(eventName: string, eventParams: Record<string, any> = {}) {
  if (typeof window !== "undefined") {
    globalThis.dataLayer = globalThis.dataLayer || [];
    globalThis.dataLayer.push({
      event: eventName,
      ...eventParams
    });
  }
}

/**
 * Track a page view event
 */
export function trackPageView(pageLocation: string, pageTitle: string) {
  pushEvent('page_view', {
    page_location: pageLocation,
    page_title: pageTitle
  });
}

/**
 * Track a form submission event
 */
export function trackFormSubmission(formName: string, formData: Record<string, any>) {
  pushEvent('form_submit', {
    form_name: formName,
    form_data: formData
  });
}

/**
 * Track a contact form submission
 */
export function trackContactFormSubmission(name: string, email: string, service: string) {
  pushEvent('contact_form_submit', {
    name,
    email,
    service
  });
}