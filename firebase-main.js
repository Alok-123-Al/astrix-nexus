import { addDoc, collection, onSnapshot, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";
import { db } from "./firebase-config.js";

const CONTACTS_COLLECTION = "contacts";
const REVIEWS_COLLECTION = "reviews";
const reviewDateFormatter = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

const ensureToastStack = () => {
  let toastStack = document.querySelector("[data-site-toast-stack]");

  if (toastStack) {
    return toastStack;
  }

  toastStack = document.createElement("div");
  toastStack.dataset.siteToastStack = "";
  toastStack.className = "site-toast-stack";
  toastStack.setAttribute("aria-live", "polite");
  toastStack.setAttribute("aria-atomic", "false");
  document.body.appendChild(toastStack);

  return toastStack;
};

const showToast = (message, type = "success") => {
  const toastStack = ensureToastStack();
  const toast = document.createElement("div");

  toast.className = `site-toast site-toast--${type}`;
  toast.textContent = message;
  toastStack.appendChild(toast);

  requestAnimationFrame(() => {
    toast.classList.add("is-visible");
  });

  window.setTimeout(() => {
    toast.classList.remove("is-visible");
    window.setTimeout(() => toast.remove(), 260);
  }, 3200);
};

const setButtonLoadingState = (button, isLoading, loadingLabel) => {
  if (!button) {
    return;
  }

  if (!button.dataset.defaultLabel) {
    button.dataset.defaultLabel = button.textContent.trim();
  }

  button.disabled = isLoading;
  button.setAttribute("aria-busy", String(isLoading));
  button.textContent = isLoading ? loadingLabel : button.dataset.defaultLabel;
};

const normalizeReviewDate = (value) => {
  if (!value) {
    return null;
  }

  if (typeof value.toDate === "function") {
    return value.toDate();
  }

  if (value instanceof Date) {
    return value;
  }

  if (typeof value === "number") {
    return new Date(value);
  }

  if (typeof value.seconds === "number") {
    return new Date(value.seconds * 1000);
  }

  return null;
};

const formatReviewDate = (value) => {
  const date = normalizeReviewDate(value);
  return date ? reviewDateFormatter.format(date) : "Just now";
};

const getReviewSortTime = (review) => {
  const createdAtDate = normalizeReviewDate(review.createdAt);

  if (createdAtDate) {
    return createdAtDate.getTime();
  }

  if (typeof review.createdAtMs === "number") {
    return review.createdAtMs;
  }

  return 0;
};

const getAvatarLetter = (name) => {
  const letter = String(name || "").trim().charAt(0).toUpperCase();
  return letter || "A";
};

const parseEmailProviderResponse = async (response) => {
  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    return response.json();
  }

  return response.text();
};

const initializeContactForm = () => {
  const contactForm = document.querySelector("#contact-form");

  if (!contactForm) {
    return;
  }

  const submitButton = contactForm.querySelector('button[type="submit"]');
  const statusMessage = document.querySelector("#success-msg");
  const formUrlInput = contactForm.querySelector("[data-contact-form-url]");
  let isSubmitting = false;
  let statusTimeoutId = 0;

  const getContactEmailEndpoint = () => {
    const configuredEndpoint = String(contactForm.dataset.ajaxEndpoint || "").trim();

    if (configuredEndpoint) {
      return configuredEndpoint;
    }

    const action = String(contactForm.getAttribute("action") || "").trim();

    if (!action) {
      return "";
    }

    if (action.includes("/ajax/")) {
      return action;
    }

    return action.replace("https://formsubmit.co/", "https://formsubmit.co/ajax/");
  };

  const clearStatusMessage = () => {
    if (!statusMessage) {
      return;
    }

    statusMessage.textContent = "";
    statusMessage.classList.add("hidden");
    statusMessage.classList.remove("text-green-400", "text-rose-300");
  };

  const showStatusMessage = (message, type) => {
    if (!statusMessage) {
      return;
    }

    if (statusTimeoutId) {
      window.clearTimeout(statusTimeoutId);
      statusTimeoutId = 0;
    }

    statusMessage.textContent = message;
    statusMessage.classList.remove("hidden", "text-green-400", "text-rose-300");
    statusMessage.classList.add(type === "error" ? "text-rose-300" : "text-green-400");

    if (type === "success") {
      statusTimeoutId = window.setTimeout(() => {
        clearStatusMessage();
      }, 4000);
    }
  };

  contactForm.addEventListener("input", () => {
    if (!statusMessage?.classList.contains("hidden")) {
      clearStatusMessage();
    }
  });

  contactForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (isSubmitting || !contactForm.reportValidity()) {
      return;
    }

    const formData = new FormData(contactForm);
    const name = String(formData.get("name") || "").trim();
    const email = String(formData.get("email") || "").trim();
    const phone = String(formData.get("phone") || "").trim();
    const subject = String(formData.get("subject") || "").trim();
    const message = String(formData.get("message") || "").trim();
    const emailEndpoint = getContactEmailEndpoint();
    const contactPageUrl = `${window.location.href.split("#")[0]}#contact`;
    let firestoreSaved = false;

    isSubmitting = true;
    clearStatusMessage();
    setButtonLoadingState(submitButton, true, "Sending...");

    try {
      if (!emailEndpoint) {
        throw new Error("Contact email endpoint is not configured.");
      }

      if (formUrlInput) {
        formUrlInput.value = contactPageUrl;
      }

      const contactDocRef = await addDoc(collection(db, CONTACTS_COLLECTION), {
        name,
        email,
        subject,
        message,
        createdAt: serverTimestamp(),
      });
      firestoreSaved = true;

      const emailFormData = new FormData(contactForm);
      emailFormData.set("_replyto", email);
      emailFormData.set("_subject", `New Contact from Astrix Nexus Website | ${subject}`);
      emailFormData.set("_url", contactPageUrl);

      const emailResponse = await fetch(emailEndpoint, {
        method: "POST",
        body: emailFormData,
        headers: {
          Accept: "application/json",
        },
      });
      const emailResponseBody = await parseEmailProviderResponse(emailResponse);

      if (!emailResponse.ok) {
        const errorMessage =
          typeof emailResponseBody === "object" && emailResponseBody && "message" in emailResponseBody
            ? String(emailResponseBody.message || "")
            : `Email request failed with status ${emailResponse.status}`;

        throw new Error(errorMessage || "Email request failed.");
      }

      if (
        typeof emailResponseBody === "object" &&
        emailResponseBody &&
        "success" in emailResponseBody &&
        String(emailResponseBody.success) === "false"
      ) {
        throw new Error(String(emailResponseBody.message || "Email request failed."));
      }

      contactForm.reset();
      showStatusMessage("Message Sent Successfully", "success");
      showToast("Message Sent Successfully", "success");
    } catch (error) {
      console.error("[Contact] response error", error);

      if (firestoreSaved) {
        contactForm.reset();
        showStatusMessage("Saved successfully but email notification failed.", "error");
        showToast("Saved successfully but email notification failed.", "error");
      } else {
        showStatusMessage("Message failed to send. Please try again.", "error");
        showToast("Message failed to send. Please try again.", "error");
      }
    } finally {
      isSubmitting = false;
      setButtonLoadingState(submitButton, false, "Sending...");
    }
  });
};

const initializeReviewSystem = () => {
  const reviewSection = document.querySelector("[data-user-reviews]");

  if (!reviewSection) {
    return;
  }

  const reviewOpenButton = reviewSection.querySelector("[data-review-open]");
  const reviewCloseButton = reviewSection.querySelector("[data-review-close]");
  const reviewBackdrop = reviewSection.querySelector("[data-review-backdrop]");
  const reviewModal = reviewSection.querySelector("[data-review-modal]");
  const reviewForm = reviewSection.querySelector("[data-review-form]");
  const reviewGrid = reviewSection.querySelector("[data-review-grid]");
  const reviewEmptyState = reviewSection.querySelector("[data-review-empty]");
  const reviewAvatarPreview = reviewSection.querySelector("[data-review-avatar-preview]");
  const reviewNameInput = reviewSection.querySelector("#review-name");
  const reviewTextInput = reviewSection.querySelector("#review-text");
  const reviewCount = reviewSection.querySelector("[data-review-count]");
  const reviewError = reviewSection.querySelector("[data-review-error]");
  const reviewSubmitButton = reviewForm?.querySelector('button[type="submit"]');
  const reviewStars = Array.from(reviewSection.querySelectorAll("[data-review-star]"));
  const requiredReviewElements = {
    reviewOpenButton,
    reviewCloseButton,
    reviewBackdrop,
    reviewModal,
    reviewForm,
    reviewGrid,
    reviewEmptyState,
    reviewAvatarPreview,
    reviewNameInput,
    reviewTextInput,
    reviewCount,
    reviewError,
    reviewSubmitButton,
  };
  const missingReviewElements = Object.entries(requiredReviewElements)
    .filter(([, element]) => !element)
    .map(([key]) => key);

  if (missingReviewElements.length) {
    console.error("[Reviews] Initialization failed. Missing required elements.", {
      missing: missingReviewElements,
    });
    return;
  }

  let selectedStars = 0;
  let isSubmitting = false;
  let renderedReviews = [];
  let reviewRetryTimeoutId = 0;
  let stopReviewSubscription = null;

  console.info("[Reviews] Write Review button initialized.");

  const clearReviewError = () => {
    if (!reviewError) {
      return;
    }

    reviewError.textContent = "";
    reviewError.classList.add("hidden");
  };

  const showReviewError = (message) => {
    if (!reviewError) {
      return;
    }

    reviewError.textContent = message;
    reviewError.classList.remove("hidden");
  };

  const updateReviewCount = () => {
    if (!reviewCount || !reviewTextInput) {
      return;
    }

    reviewCount.textContent = `${reviewTextInput.value.length} / 420`;
  };

  const updateAvatarPreview = (name) => {
    if (!reviewAvatarPreview) {
      return;
    }

    reviewAvatarPreview.textContent = getAvatarLetter(name);
  };

  const syncReviewStars = () => {
    reviewStars.forEach((starButton) => {
      const rating = Number(starButton.dataset.rating || "0");
      const isActive = rating <= selectedStars;

      starButton.dataset.active = isActive ? "true" : "false";
      starButton.setAttribute("aria-pressed", String(isActive));
      starButton.setAttribute("aria-checked", String(isActive));
    });
  };

  const resetReviewForm = () => {
    reviewForm?.reset();
    selectedStars = 0;
    syncReviewStars();
    updateReviewCount();
    updateAvatarPreview("");
    clearReviewError();
    setButtonLoadingState(reviewSubmitButton, false, "Submitting...");
    isSubmitting = false;
  };

  const setReviewModalState = (isOpen) => {
    reviewOpenButton?.setAttribute("aria-expanded", String(isOpen));
    reviewModal?.classList.toggle("is-open", isOpen);
    reviewBackdrop?.classList.toggle("is-open", isOpen);
    reviewModal?.setAttribute("aria-hidden", String(!isOpen));
    reviewBackdrop?.setAttribute("aria-hidden", String(!isOpen));

    if (isOpen) {
      console.info("[Reviews] Modal opened.");
      window.setTimeout(() => reviewNameInput?.focus(), 60);
      return;
    }

    resetReviewForm();
  };

  const createReviewCard = (review) => {
    const card = document.createElement("article");
    card.dataset.reviewCard = "";
    card.className =
      "rounded-2xl border border-white/10 bg-slate-800/80 p-5 shadow-[0_20px_60px_-36px_rgba(59,130,246,0.35)] transition duration-300 hover:-translate-y-1";

    const header = document.createElement("div");
    header.className = "flex items-start gap-4";

    const avatar = document.createElement("div");
    avatar.className =
      "flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-white/10 bg-slate-950/80 text-lg font-semibold uppercase tracking-[0.08em] text-white";
    avatar.textContent = getAvatarLetter(review.name);

    const meta = document.createElement("div");
    meta.className = "min-w-0 flex-1";

    const name = document.createElement("h3");
    name.className = "text-lg font-semibold text-white break-words";
    name.textContent = review.name;

    const stars = document.createElement("p");
    stars.className = "mt-1 text-sm tracking-[0.18em] text-amber-300";
    stars.textContent = `${"\u2605".repeat(review.stars)}${"\u2606".repeat(5 - review.stars)}`;

    const date = document.createElement("p");
    date.className = "mt-2 text-xs font-medium uppercase tracking-[0.18em] text-slate-400";
    date.textContent = formatReviewDate(review.createdAt);

    const body = document.createElement("p");
    body.className = "mt-4 text-sm leading-7 text-slate-200 whitespace-pre-wrap break-words";
    body.textContent = review.text;

    meta.append(name, stars, date);
    header.append(avatar, meta);
    card.append(header, body);

    return card;
  };

  const renderReviews = () => {
    if (!reviewGrid || !reviewEmptyState) {
      return;
    }

    reviewGrid.innerHTML = "";

    if (!renderedReviews.length) {
      reviewEmptyState.classList.remove("hidden");
      return;
    }

    reviewEmptyState.classList.add("hidden");

    renderedReviews.forEach((review) => {
      reviewGrid.appendChild(createReviewCard(review));
    });
  };

  const clearReviewRetry = () => {
    if (!reviewRetryTimeoutId) {
      return;
    }

    window.clearTimeout(reviewRetryTimeoutId);
    reviewRetryTimeoutId = 0;
  };

  const scheduleReviewRetry = () => {
    if (reviewRetryTimeoutId) {
      return;
    }

    reviewRetryTimeoutId = window.setTimeout(() => {
      reviewRetryTimeoutId = 0;
      subscribeToReviews();
    }, 4000);
  };

  const subscribeToReviews = () => {
    stopReviewSubscription?.();
    clearReviewRetry();

    stopReviewSubscription = onSnapshot(
      collection(db, REVIEWS_COLLECTION),
      (snapshot) => {
        renderedReviews = snapshot.docs
          .map((docSnapshot) => {
            const data = docSnapshot.data();
            const name = String(data.name || "").trim();
            const text = String(data.text ?? data.message ?? "").trim();
            const stars = Number(data.stars ?? data.rating ?? 0);

            return {
              id: docSnapshot.id,
              name,
              text,
              stars,
              createdAt: data.createdAt || null,
              createdAtMs:
                typeof data.createdAtMs === "number" ? data.createdAtMs : 0,
            };
          })
          .filter((review) => {
            return review.name && review.text && review.stars >= 1 && review.stars <= 5;
          })
          .sort((leftReview, rightReview) => {
            return getReviewSortTime(rightReview) - getReviewSortTime(leftReview);
          });

        renderReviews();
      },
      (error) => {
        console.error("[Reviews] Firestore subscription error.", error);
        showToast("Could not load reviews right now. Retrying...", "error");
        scheduleReviewRetry();
      }
    );
  };

  reviewOpenButton?.addEventListener("click", () => setReviewModalState(true));
  reviewCloseButton?.addEventListener("click", () => setReviewModalState(false));
  reviewBackdrop?.addEventListener("click", () => setReviewModalState(false));

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && reviewModal?.classList.contains("is-open")) {
      setReviewModalState(false);
    }
  });

  reviewStars.forEach((starButton) => {
    starButton.addEventListener("click", () => {
      selectedStars = Number(starButton.dataset.rating || "0");
      syncReviewStars();
      clearReviewError();
    });
  });

  reviewNameInput?.addEventListener("input", () => {
    updateAvatarPreview(reviewNameInput.value);
    clearReviewError();
  });

  reviewTextInput?.addEventListener("input", () => {
    updateReviewCount();
    clearReviewError();
  });

  reviewForm?.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (isSubmitting || !reviewForm.reportValidity()) {
      return;
    }

    clearReviewError();

    const name = String(reviewNameInput?.value || "").trim();
    const text = String(reviewTextInput?.value || "").trim();

    if (!name) {
      showReviewError("Please enter your full name.");
      reviewNameInput?.focus();
      return;
    }

    if (!selectedStars) {
      showReviewError("Please select a star rating.");
      return;
    }

    if (!text) {
      showReviewError("Please write a short review.");
      reviewTextInput?.focus();
      return;
    }

    if (text.length > 420) {
      showReviewError("Please keep your review within 420 characters.");
      reviewTextInput?.focus();
      return;
    }

    console.info("[Reviews] Review submitted.");
    isSubmitting = true;
    setButtonLoadingState(reviewSubmitButton, true, "Submitting...");

    try {
      const reviewRef = await addDoc(collection(db, REVIEWS_COLLECTION), {
        name,
        text,
        stars: selectedStars,
        createdAt: serverTimestamp(),
        createdAtMs: Date.now(),
      });
      console.info("[Reviews] Firestore success.", { id: reviewRef.id });
      setReviewModalState(false);
      showToast("Review submitted successfully.", "success");
    } catch (error) {
      console.error("[Reviews] Firestore error.", error);
      showReviewError("Could not submit your review right now. Please try again.");
      setButtonLoadingState(reviewSubmitButton, false, "Submitting...");
      isSubmitting = false;
    }
  });

  syncReviewStars();
  updateReviewCount();
  updateAvatarPreview("");
  renderReviews();
  subscribeToReviews();
};

initializeContactForm();
initializeReviewSystem();
