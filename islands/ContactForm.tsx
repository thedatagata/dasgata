// islands/ContactForm.tsx
import { useState } from "preact/hooks";

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
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e: Event) => {
    const target = e.target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
    setFormData({
      ...formData,
      [target.name]: target.value,
    });
  };

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // For demo purposes, we're just simulating a successful submission
    // In a real implementation, you would submit to a backend API
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1500));
      
      // Success state
      setFormStatus({
        submitted: true,
        success: true,
        message: "Thank you for your message! We'll get back to you shortly.",
      });
      
      // Reset form data
      setFormData({
        name: "",
        email: "",
        service: "data-architecture",
        message: "",
      });
    } catch (error) {
      // Error state
      setFormStatus({
        submitted: true,
        success: false,
        message: "There was an error submitting your message. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
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
            disabled={isSubmitting}
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
            disabled={isSubmitting}
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Service Interested In</label>
          <select 
            name="service" 
            value={formData.service}
            onChange={handleChange}
            class="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#90C137] focus:border-[#90C137]"
            disabled={isSubmitting}
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
            disabled={isSubmitting}
          ></textarea>
        </div>
        <button
          type="submit"
          class={`w-full py-2 px-4 rounded-md ${
            isSubmitting 
              ? "bg-gray-400 cursor-not-allowed" 
              : "bg-[#90C137] hover:bg-[#7dab2a]"
          } text-white transition-colors`}
          disabled={isSubmitting}
        >
          {isSubmitting ? "Sending..." : "Send Message"}
        </button>
      </form>
    </div>
  );
}