package domain

import (
	"errors"
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// SubscriptionTier represents the subscription level of a business
type SubscriptionTier string

const (
	TierFree    SubscriptionTier = "FREE"
	TierPremium SubscriptionTier = "PREMIUM"
)

// Business represents a shop or business entity
type Business struct {
	ID        primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	UserID    primitive.ObjectID `bson:"user_id" json:"user_id"`
	Name      string             `bson:"name" json:"name"`
	Currency  string             `bson:"currency" json:"currency"`
	Language  string             `bson:"language" json:"language"`
	Timezone  string             `bson:"timezone" json:"timezone"`
	Tier      SubscriptionTier   `bson:"tier" json:"tier"`
	CreatedAt time.Time          `bson:"created_at" json:"created_at"`
	UpdatedAt time.Time          `bson:"updated_at" json:"updated_at"`
}

// NewBusiness creates a new Business instance with default settings
func NewBusiness(userID primitive.ObjectID, name, currency, language, timezone string) *Business {
	now := time.Now()
	// Set defaults if empty
	if currency == "" {
		currency = "USD"
	}
	if language == "" {
		language = "en"
	}
	if timezone == "" {
		timezone = "UTC"
	}

	return &Business{
		ID:        primitive.NewObjectID(),
		UserID:    userID,
		Name:      name,
		Currency:  currency,
		Language:  language,
		Timezone:  timezone,
		Tier:      TierFree, // Default to FREE tier
		CreatedAt: now,
		UpdatedAt: now,
	}
}

// Validate checks if the business data is valid
func (b *Business) Validate() error {
	if b.UserID.IsZero() {
		return errors.New("user ID is required")
	}
	if b.Name == "" {
		return errors.New("business name is required")
	}
	if b.Currency == "" {
		return errors.New("currency is required")
	}
	return nil
}

type BusinessRepository interface {
	FindByID(id string) (*Business, error)
}
