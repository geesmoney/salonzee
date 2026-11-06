import { useState } from "react";
import { Search, CalendarCheck, MessageSquare, Store, Bell, Star, Check, MapPin, ChevronRight, CalendarDays, Clock, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import nailsPhoto from "@/assets/feature-nails.jpg";
import barberPhoto from "@/assets/feature-barber.jpg";

const customerSteps = [
  { icon: Search, title: "Find your shop", detail: "Explore by category and location." },
  { icon: CalendarCheck, title: "Choose your time", detail: "Pick a service and an available slot." },
  { icon: MessageSquare, title: "Stay connected", detail: "Booking details by SMS. Chat on WhatsApp." },
];
const ownerSteps = [
  { icon: Store, title: "Show your work", detail: "Your photos, services and prices in one place." },
  { icon: Bell, title: "Manage bookings", detail: "New bookings, SMS alerts and calendar sync." },
  { icon: Star, title: "Build your reputation", detail: "Completed appointments become review invitations." },
];

function ShopPreview() {
  return <div className="space-y-4">
    <div className="flex items-center gap-2 border border-border rounded-lg px-3 py-2.5 text-sm"><Search className="size-4 text-primary" /> Beauty businesses in Accra</div>
    <div className="flex flex-wrap gap-2 text-xs"><span className="rounded-full bg-secondary text-secondary-foreground px-3 py-1.5">Nail tech</span><span className="rounded-full bg-muted text-muted-foreground px-3 py-1.5">Barbering</span><span className="rounded-full bg-muted text-muted-foreground px-3 py-1.5">Hair salon</span></div>
    <div className="grid grid-cols-2 gap-3">
      {[{ image: nailsPhoto, name: "Accra Nail Studio", type: "Nail tech" }, { image: barberPhoto, name: "Neighbourhood Cuts", type: "Barbering" }].map(shop => <div key={shop.name} className="overflow-hidden rounded-lg border border-border">
        <img src={shop.image} alt={shop.type === "Nail tech" ? "A close-up of nail artistry" : "A barber at work"} className="aspect-[4/3] w-full object-cover" loading="lazy" />
        <div className="p-3"><span className="text-[11px] text-primary">{shop.type}</span><p className="font-semibold text-sm mt-1">{shop.name}</p><p className="flex items-center gap-1 text-xs text-muted-foreground mt-2"><MapPin className="size-3 shrink-0" /> Accra</p></div>
      </div>)}
    </div>
  </div>;
}

function BookingPreview() {
  return <div className="space-y-5">
    <div><p className="text-xs text-muted-foreground mb-1">Accra Nail Studio</p><h3 className="text-lg font-semibold">Book an appointment</h3></div>
    <div className="border-b border-border pb-4 flex items-center justify-between gap-3"><div><p className="font-medium text-sm">Gel manicure</p><p className="flex items-center gap-1 text-xs text-muted-foreground mt-1"><Clock className="size-3" /> 45 min</p></div><span className="font-semibold text-sm">GHS 100</span></div>
    <div><p className="text-xs font-medium mb-2">Select a date</p><div className="grid grid-cols-5 gap-2">{["Mon", "Tue", "Wed", "Thu", "Fri"].map((day, i) => <div key={day} className={`rounded-lg py-2 text-center ${i === 2 ? "bg-secondary text-secondary-foreground ring-1 ring-primary" : "bg-muted text-muted-foreground"}`}><p className="text-[11px]">{day}</p><p className="text-base font-semibold mt-1">{9 + i}</p></div>)}</div></div>
    <div><p className="text-xs font-medium mb-2">Available times</p><div className="grid grid-cols-3 gap-2 text-xs text-center"><span className="bg-muted rounded-lg py-2.5">10:00 AM</span><span className="bg-secondary rounded-lg py-2.5 ring-1 ring-primary">11:00 AM</span><span className="bg-muted rounded-lg py-2.5">2:00 PM</span></div></div>
    <div className="flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-lg py-3 text-sm font-semibold"><Check className="size-4" /> Confirm booking</div>
  </div>;
}

function MessagePreview() {
  return <div className="space-y-5">
    <div className="flex items-center gap-3"><div className="size-10 rounded-full bg-secondary text-primary grid place-items-center"><MessageSquare className="size-5" /></div><div><p className="font-semibold text-sm">Salonzee</p><p className="text-xs text-muted-foreground">SMS · Now</p></div></div>
    <div className="bg-muted rounded-lg p-5 text-sm leading-relaxed"><p className="font-semibold mb-2">Your booking details</p><p>Hi Ama, your gel manicure booking at Accra Nail Studio is received.</p><div className="border-t border-border mt-4 pt-4 space-y-2"><p className="flex gap-2 items-center"><CalendarDays className="size-4 text-primary" /> Wednesday · 11:00 AM</p><p className="flex gap-2 items-center"><MapPin className="size-4 text-primary" /> Accra</p></div></div>
    <div className="flex gap-2 items-center justify-center text-primary border border-primary rounded-lg py-3 text-sm font-semibold"><MessageCircle className="size-4" /> WhatsApp the shop</div>
    <p className="text-xs text-muted-foreground text-center">The shop's details travel with your booking.</p>
  </div>;
}

function ProfilePreview() {
  return <div className="space-y-4">
    <img src={nailsPhoto} alt="Nail artistry displayed as a shop cover photo" className="w-full aspect-[16/7] rounded-lg object-cover" loading="lazy" />
    <div><div className="flex items-center justify-between gap-2"><h3 className="font-semibold text-lg">Accra Nail Studio</h3><span className="flex items-center gap-1 text-xs text-primary"><Star className="size-3 fill-current" /> 4.8</span></div><p className="text-xs text-muted-foreground mt-1">Nail tech · Accra</p></div>
    <div className="border-t border-border pt-3"><p className="text-xs font-semibold mb-2">Services</p>{[{ name: "Gel manicure", price: "100", time: "45 min" }, { name: "Pedicure", price: "120", time: "60 min" }].map(service => <div key={service.name} className="flex justify-between items-center py-2.5 border-b border-border text-sm"><div><p className="font-medium">{service.name}</p><p className="text-xs text-muted-foreground">{service.time}</p></div><span className="font-semibold">GHS {service.price}</span></div>)}</div>
  </div>;
}

function DashboardPreview() {
  return <div className="space-y-4">
    <div className="flex items-center justify-between"><h3 className="font-semibold text-lg">Bookings</h3><CalendarDays className="size-5 text-primary" /></div>
    <div className="grid grid-cols-2 gap-3 border-y border-border py-3"><div><p className="text-xs text-muted-foreground">Today's bookings</p><p className="text-2xl font-bold mt-1">3</p></div><div><p className="text-xs text-muted-foreground">Completed earnings</p><p className="text-2xl font-bold mt-1">GHS 220</p></div></div>
    <div className="space-y-3">{[{ name: "Ama", service: "Gel manicure", time: "11:00 AM", status: "Pending" }, { name: "Akua", service: "Pedicure", time: "9:00 AM", status: "Completed" }].map(booking => <div key={booking.name} className="flex items-start justify-between gap-2 border-b border-border pb-3 text-sm"><div><p className="font-semibold">{booking.name}</p><p className="text-xs text-muted-foreground mt-1">{booking.service} · {booking.time}</p></div><span className={`rounded-full px-2 py-1 text-[10px] ${booking.status === "Completed" ? "bg-secondary text-secondary-foreground" : "bg-muted text-muted-foreground"}`}>{booking.status}</span></div>)}</div>
    <div className="flex items-start gap-2 bg-secondary rounded-lg p-3 text-xs"><Bell className="size-4 text-primary shrink-0" /><div><p className="font-semibold">New booking received</p><p className="mt-1 text-muted-foreground">An SMS also goes to the shop owner.</p></div></div>
    <div className="flex items-center gap-2 text-xs text-muted-foreground"><CalendarCheck className="size-4 text-primary" /> Google · Apple · Outlook Calendar</div>
  </div>;
}

function ReviewPreview() {
  return <div className="space-y-5">
    <div className="flex items-center gap-2 text-xs text-primary"><Check className="size-4" /> Appointment completed</div>
    <div className="bg-muted rounded-lg p-4 text-sm leading-relaxed"><MessageSquare className="size-5 text-primary mb-2" /><p>Hi Ama, thanks for visiting Accra Nail Studio. How was your appointment? Leave a review using your personal link.</p></div>
    <div className="text-center border-t border-border pt-5"><p className="font-semibold">How was your visit?</p><div className="flex justify-center gap-2 text-orange my-3">{[1, 2, 3, 4, 5].map(rating => <Star key={rating} className="size-6 fill-current" />)}</div><p className="text-sm text-muted-foreground">“Loved my nails. Such careful work!”</p><p className="text-xs text-primary mt-3 flex justify-center items-center gap-1"><Check className="size-3" /> Review linked to an appointment</p></div>
  </div>;
}

export function FeatureWalkthrough({ audience }: { audience: "customer" | "business" }) {
  const [step, setStep] = useState(0);
  const steps = audience === "customer" ? customerSteps : ownerSteps;
  const previews = audience === "customer" ? [ShopPreview, BookingPreview, MessagePreview] : [ProfilePreview, DashboardPreview, ReviewPreview];
  const Preview = previews[step] ?? previews[0];
  const panelId = `feature-preview-${audience}`;
  return <div className="grid md:grid-cols-2 gap-6 lg:gap-12 items-center mb-8 border-y border-border py-7 md:py-9">
    <div role="tablist" aria-label={`${audience === "customer" ? "Customer" : "Business owner"} walkthrough`} className="space-y-2">
      {steps.map(({ icon: Icon, title, detail }, index) => <Button key={title} id={`${panelId}-tab-${index}`} role="tab" aria-selected={step === index} aria-controls={panelId} variant="ghost" onClick={() => setStep(index)} onKeyDown={event => { if (event.key === "ArrowDown" || event.key === "ArrowUp") { event.preventDefault(); const next = (index + (event.key === "ArrowDown" ? 1 : -1) + steps.length) % steps.length; setStep(next); document.getElementById(`${panelId}-tab-${next}`)?.focus(); } }} tabIndex={step === index ? 0 : -1} className={`w-full h-auto whitespace-normal rounded-lg p-4 text-left justify-start ${step === index ? "bg-secondary hover:bg-secondary" : "text-muted-foreground"}`}>
        <span className={`size-11 rounded-lg shrink-0 grid place-items-center ${step === index ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}><Icon className="size-5" /></span>
        <span className="flex-1 min-w-0"><span className="block text-xs text-muted-foreground mb-1">0{index + 1}</span><span className="block text-base font-semibold text-foreground">{title}</span><span className="block text-sm font-normal text-muted-foreground mt-1 leading-relaxed">{detail}</span></span>
        <ChevronRight className="size-4 shrink-0" />
      </Button>)}
    </div>
    <figure className="min-w-0">
      <div id={panelId} role="tabpanel" aria-labelledby={`${panelId}-tab-${step}`} className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="bg-muted border-b border-border flex justify-between items-center px-5 py-3"><span className="text-sm font-semibold">Salonzee</span><span className="text-[11px] text-muted-foreground">{audience === "customer" ? "Customer" : "Business owner"}</span></div>
        <div className="p-5 sm:p-6 min-h-[370px]"><Preview /></div>
      </div>
      <figcaption className="text-[11px] text-muted-foreground mt-3 text-center">Illustrative example · Shop names, prices and figures are sample data.</figcaption>
    </figure>
  </div>;
}