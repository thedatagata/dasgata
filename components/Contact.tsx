// components/Contact.tsx
import ContactForm from "../islands/ContactForm.tsx";

export default function Contact() {
  return (
    <div id="contact" class="py-24 bg-[#F8F6F0]">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center mb-16">
          <h2 class="text-4xl lg:text-5xl font-bold text-[#172217] mb-4">Get in Touch</h2>
          <p class="text-xl text-gray-600 max-w-3xl mx-auto">
            Ready to transform your data architecture? Have questions about our services? 
            We're here to help. Reach out to us and one of our data experts will get back to you shortly.
          </p>
        </div>
        
        <div class="grid md:grid-cols-2 gap-12 items-center">
          {/* Contact Information */}
          <div>
            <div class="space-y-6">
              <div class="flex items-start gap-4">
                <div class="w-12 h-12 bg-[#90C137]/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <i class="fas fa-envelope text-[#90C137] text-xl"></i>
                </div>
                <div>
                  <h3 class="text-lg font-medium text-[#172217]">Email Us</h3>
                  <p class="text-gray-600 mt-1">
                    <a href="mailto:contact@dasgata.com" class="text-[#90C137] hover:text-[#7dab2a] transition-colors">
                      contact@dasgata.com
                    </a>
                  </p>
                  <p class="text-gray-500 text-sm mt-1">
                    We aim to respond to all inquiries within 24 hours.
                  </p>
                </div>
              </div>
              
              <div class="flex items-start gap-4">
                <div class="w-12 h-12 bg-[#90C137]/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <i class="fas fa-map-marker-alt text-[#90C137] text-xl"></i>
                </div>
                <div>
                  <h3 class="text-lg font-medium text-[#172217]">Location</h3>
                  <p class="text-gray-600 mt-1">
                    Durham, North Carolina, USA
                  </p>
                  <p class="text-gray-500 text-sm mt-1">
                    We work with clients worldwide remotely.
                  </p>
                </div>
              </div>
              
              <div class="flex items-start gap-4">
                <div class="w-12 h-12 bg-[#90C137]/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <i class="fas fa-calendar-alt text-[#90C137] text-xl"></i>
                </div>
                <div>
                  <h3 class="text-lg font-medium text-[#172217]">Schedule a Call</h3>
                  <p class="text-gray-600 mt-1">
                    <a 
                      href="https://calendly.com/datagata/30min" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      class="text-[#90C137] hover:text-[#7dab2a] transition-colors inline-flex items-center"
                    >
                      <span>Book a 30-minute consultation</span>
                      <svg class="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path>
                      </svg>
                    </a>
                  </p>
                </div>
              </div>
            </div>
            
            {/* Social links */}
            <div class="mt-8">
              <h3 class="text-lg font-medium text-[#172217] mb-4">Connect With Us</h3>
              <div class="flex space-x-4">
                <a 
                  href="https://github.com/thedatagata" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  class="w-10 h-10 bg-[#172217] text-white rounded-full flex items-center justify-center hover:bg-[#90C137] transition-colors"
                  aria-label="GitHub"
                >
                  <i class="fab fa-github"></i>
                </a>
                <a 
                  href="https://www.linkedin.com/company/datagata" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  class="w-10 h-10 bg-[#0077b5] text-white rounded-full flex items-center justify-center hover:bg-[#90C137] transition-colors"
                  aria-label="LinkedIn"
                >
                  <i class="fab fa-linkedin-in"></i>
                </a>
              </div>
            </div>
          </div>
          
          {/* Contact Form Island */}
          <ContactForm />
        </div>
      </div>
    </div>
  );
}