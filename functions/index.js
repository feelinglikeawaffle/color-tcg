const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");

initializeApp();
const db = getFirestore();
const REGION = "us-central1";
const MAX_PRICE = 1000000000000;

function uidFor(request) {
  if (!request.auth || !request.auth.uid) throw new HttpsError("unauthenticated", "Sign in first.");
  return request.auth.uid;
}
function validPrice(value) {
  return Number.isSafeInteger(value) && value >= 1 && value <= MAX_PRICE;
}

exports.ensurePlayerAccount = onCall({ region: REGION }, async (request) => {
  const uid = uidFor(request);
  const accountRef = db.collection("playerAccounts").doc(uid);
  const profileRef = db.collection("profiles").doc(uid);
  await db.runTransaction(async (tx) => {
    const account = await tx.get(accountRef);
    const profile = await tx.get(profileRef);
    if (!account.exists) tx.create(accountRef, { balance: 0, createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
    if (!profile.exists) tx.create(profileRef, {
      displayName: String(request.auth.token.name || "Collector").slice(0, 40),
      photoURL: String(request.auth.token.picture || "").slice(0, 2048),
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    });
  });
  return { ok: true };
});

exports.createMarketListing = onCall({ region: REGION }, async (request) => {
  const uid = uidFor(request);
  const { cardId, price } = request.data || {};
  if (typeof cardId !== "string" || !/^[A-Za-z0-9_-]{1,128}$/.test(cardId)) throw new HttpsError("invalid-argument", "Choose a valid card.");
  if (!validPrice(price)) throw new HttpsError("invalid-argument", "Enter a whole-number price.");
  const cardRef = db.collection("playerCards").doc(cardId);
  const listingRef = db.collection("marketListings").doc();
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(cardRef);
    if (!snap.exists) throw new HttpsError("not-found", "That card is not in your verified account collection.");
    const card = snap.data();
    if (card.ownerUid !== uid) throw new HttpsError("permission-denied", "You do not own that card.");
    if (card.listingId) throw new HttpsError("failed-precondition", "That card is already listed.");
    if (card.locked === true) throw new HttpsError("failed-precondition", "Remove the card from its display case first.");
    tx.update(cardRef, { listingId: listingRef.id, updatedAt: FieldValue.serverTimestamp() });
    tx.create(listingRef, {
      sellerUid: uid, cardId,
      cardSnapshot: {
        name: String(card.name || "Paint Card").slice(0, 80),
        rarity: String(card.rarity || "Common").slice(0, 30),
        variant: String(card.variant || "Standard").slice(0, 30),
        hex: /^#[0-9a-fA-F]{6}$/.test(card.hex || "") ? card.hex : "#888888",
        collectorValue: Number.isSafeInteger(card.collectorValue) ? card.collectorValue : 0
      },
      price, status: "active",
      createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp()
    });
  });
  return { ok: true, listingId: listingRef.id };
});

exports.cancelMarketListing = onCall({ region: REGION }, async (request) => {
  const uid = uidFor(request);
  const { listingId } = request.data || {};
  if (typeof listingId !== "string" || !/^[A-Za-z0-9_-]{1,128}$/.test(listingId)) throw new HttpsError("invalid-argument", "Choose a valid listing.");
  const listingRef = db.collection("marketListings").doc(listingId);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(listingRef);
    if (!snap.exists) throw new HttpsError("not-found", "Listing not found.");
    const listing = snap.data();
    if (listing.sellerUid !== uid) throw new HttpsError("permission-denied", "Only the seller can cancel this listing.");
    if (listing.status !== "active") throw new HttpsError("failed-precondition", "This listing is no longer active.");
    const cardRef = db.collection("playerCards").doc(listing.cardId);
    const cardSnap = await tx.get(cardRef);
    if (!cardSnap.exists || cardSnap.data().ownerUid !== uid || cardSnap.data().listingId !== listingRef.id) throw new HttpsError("failed-precondition", "The card no longer matches this listing.");
    tx.update(cardRef, { listingId: null, updatedAt: FieldValue.serverTimestamp() });
    tx.update(listingRef, { status: "cancelled", updatedAt: FieldValue.serverTimestamp() });
  });
  return { ok: true };
});

exports.buyMarketListing = onCall({ region: REGION }, async (request) => {
  const buyerUid = uidFor(request);
  const { listingId } = request.data || {};
  if (typeof listingId !== "string" || !/^[A-Za-z0-9_-]{1,128}$/.test(listingId)) throw new HttpsError("invalid-argument", "Choose a valid listing.");
  const listingRef = db.collection("marketListings").doc(listingId);
  const txRef = db.collection("marketTransactions").doc();
  await db.runTransaction(async (tx) => {
    const listingSnap = await tx.get(listingRef);
    if (!listingSnap.exists) throw new HttpsError("not-found", "Listing not found.");
    const listing = listingSnap.data();
    if (listing.status !== "active") throw new HttpsError("failed-precondition", "This listing is no longer active.");
    if (listing.sellerUid === buyerUid) throw new HttpsError("failed-precondition", "You cannot buy your own listing.");
    if (!validPrice(listing.price)) throw new HttpsError("failed-precondition", "This listing has an invalid price.");
    const buyerRef = db.collection("playerAccounts").doc(buyerUid);
    const sellerRef = db.collection("playerAccounts").doc(listing.sellerUid);
    const cardRef = db.collection("playerCards").doc(listing.cardId);
    const buyerSnap = await tx.get(buyerRef);
    const sellerSnap = await tx.get(sellerRef);
    const cardSnap = await tx.get(cardRef);
    if (!buyerSnap.exists || !sellerSnap.exists || !cardSnap.exists) throw new HttpsError("failed-precondition", "A required player account or card is missing.");
    const buyer = buyerSnap.data(), seller = sellerSnap.data(), card = cardSnap.data();
    if (card.ownerUid !== listing.sellerUid || card.listingId !== listingRef.id) throw new HttpsError("failed-precondition", "The seller no longer owns this listed card.");
    if (!Number.isSafeInteger(buyer.balance) || buyer.balance < listing.price) throw new HttpsError("failed-precondition", "You do not have enough verified funds.");
    if (!Number.isSafeInteger(seller.balance) || seller.balance + listing.price > Number.MAX_SAFE_INTEGER) throw new HttpsError("failed-precondition", "Seller balance is invalid.");
    tx.update(buyerRef, { balance: buyer.balance - listing.price, updatedAt: FieldValue.serverTimestamp() });
    tx.update(sellerRef, { balance: seller.balance + listing.price, updatedAt: FieldValue.serverTimestamp() });
    tx.update(cardRef, { ownerUid: buyerUid, listingId: null, updatedAt: FieldValue.serverTimestamp() });
    tx.update(listingRef, { status: "sold", buyerUid, soldAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
    tx.create(txRef, { listingId, cardId: listing.cardId, buyerUid, sellerUid: listing.sellerUid, price: listing.price, createdAt: FieldValue.serverTimestamp() });
  });
  return { ok: true, transactionId: txRef.id };
});
