import { useState, useEffect } from "preact/hooks";

export default function ContactForm() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    service: "data-architecture",
    message: "",
  });
  
  const [formStatus, setFormStatus] = useState({
    submitted: false,
    success: false,
    message: "",
    isSubmitting: false
  });

  const handleChange = (e: Event) => {
    const target = e.target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
    setFormData({
      ...formData,
      [target.name]: target.value,
    });
  };

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    setFormStatus({
      ...formStatus,
      isSubmitting: true
    });
    
    // Validate form data
    if (!formData.name || !formData.email || !formData.message) {
      setFormStatus({
        submitted: true,
        success: false,
        message: "Please fill out all required fields.",
        isSubmitting: false
      });
      return;
    }
    
    try {
      // Submit to our API endpoint
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });
      
      const result = await response.json();
      
      if (response.ok && result.success) {
        // Success response
        setFormStatus({
          submitted: true,
          success: true,
          message: "Thank you for your message! We'll get back to you shortly.",
          isSubmitting: false
        });
        
        // Track successful form submission with PostHog
        if (globalThis.posthog) {
          globalThis.posthog.capture('form_submitted', {
            form_type: 'contact',
            service_selected: formData.service,
            message_length: formData.message.length,
            visitor_id: result.visitor_id || 'unknown'
          });
        }
        
        // Reset form data
        setFormData({
          name: "",
          email: "",
          service: "data-architecture",
          message: "",
        });
      } else {
        // Error response from server
        setFormStatus({
          submitted: true,
          success: false,
          message: result.error || "There was an error submitting your message. Please try again.",
          isSubmitting: false
        });
        
        // Track form submission failure
        if (globalThis.posthog) {
          globalThis.posthog.capture('form_error', {
            form_type: 'contact',
            error_message: result.error || 'Unknown error',
            service_selected: formData.service
          });
        }
      }
    } catch (error) {
      // Network or other error
      console.error("Error submitting form:", error);
      setFormStatus({
        submitted: true,
        success: false,
        message: "There was an error connecting to the server. Please try again later.",
        isSubmitting: false
      });
      
      // Track network error
      if (globalThis.posthog) {
        globalThis.posthog.capture('form_network_error', {
          form_type: 'contact',
          error_type: 'network',
          service_selected: formData.service
        });
      }
    }
  };

  return (
    <div class="bg-white p-8 rounded-lg shadow-lg border border-gray-100">
      <h3 class="text-2xl font-semibold text-[#172217] mb-6">Send Us a Message</h3>
      
      {formStatus.submitted && (
        <div 
          class={`mb-6 p-4 rounded-md ${
            formStatus.success ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
          }`}
        >
          {formStatus.message}
        </div>
      )}
      
      <form class="space-y-4" onSubmit={handleSubmit}>
        {/* Form fields remain unchanged */}
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Your Name</label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            class="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#90C137] focus:border-[#90C137]"
            placeholder="John Doe"
            disabled={formStatus.isSubmitting}
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
            class="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#90C137] focus:border-[#90C137]"
            placeholder="john@example.com"
            disabled={formStatus.isSubmitting}
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Service Interested In</label>
          <select 
            name="service" 
            value={formData.service}
            onChange={handleChange}
            class="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#90C137] focus:border-[#90C137]"
            disabled={formStatus.isSubmitting}
          >
            <option value="data-architecture">Data Architecture</option>
            <option value="analytics-engineering">Analytics Engineering</option>
            <option value="data-lakehouse">Lakehouse Implementation</option>
            <option value="consultation">General Consultation</option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Message</label>
          <textarea
            name="message"
            value={formData.message}
            onChange={handleChange}
            required
            rows={4}
            class="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#90C137] focus:border-[#90C137]"
            placeholder="Tell us about your project or questions..."
            disabled={formStatus.isSubmitting}
          ></textarea>
        </div>
        <button
          type="submit"
          class={`w-full py-2 px-4 rounded-md ${
            formStatus.isSubmitting 
              ? "bg-gray-400 cursor-not-allowed" 
              : "bg-[#90C137] hover:bg-[#7dab2a]"
          } text-white transition-colors`}
          disabled={formStatus.isSubmitting}
        >
          {formStatus.isSubmitting ? "Sending..." : "Send Message"}
        </button>
      </form>
    </div>
  );
}