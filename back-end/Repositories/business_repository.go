package repositories

import (
	"context"
	"time"

	domain "shop-ops/Domain"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

type BusinessRepository interface {
	Save(business *domain.Business) error
	FindByID(id string) (*domain.Business, error)
	FindByUserId(userId string) ([]*domain.Business, error)
	Update(business *domain.Business) error
	FindByNameAndUserId(name string, userId string) (*domain.Business, error)
}

type businessRepository struct {
	collection *mongo.Collection
}

func NewBusinessRepository(db *mongo.Database) BusinessRepository {
	return &businessRepository{
		collection: db.Collection("businesses"),
	}
}

func (r *businessRepository) Save(business *domain.Business) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	_, err := r.collection.InsertOne(ctx, business)
	return err
}

func (r *businessRepository) FindByID(id string) (*domain.Business, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	objID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return nil, err
	}

	var business domain.Business
	err = r.collection.FindOne(ctx, bson.M{"_id": objID}).Decode(&business)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, nil
		}
		return nil, err
	}
	return &business, nil
}

func (r *businessRepository) FindByUserId(userId string) ([]*domain.Business, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	uID, err := primitive.ObjectIDFromHex(userId)
	if err != nil {
		return nil, err
	}

	cursor, err := r.collection.Find(ctx, bson.M{"user_id": uID})
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var businesses []*domain.Business
	if err = cursor.All(ctx, &businesses); err != nil {
		return nil, err
	}
	return businesses, nil
}

func (r *businessRepository) Update(business *domain.Business) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	filter := bson.M{"_id": business.ID}
	update := bson.M{"$set": business}

	_, err := r.collection.UpdateOne(ctx, filter, update)
	return err
}

func (r *businessRepository) FindByNameAndUserId(name string, userId string) (*domain.Business, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	uID, err := primitive.ObjectIDFromHex(userId)
	if err != nil {
		return nil, err
	}

	var business domain.Business
	err = r.collection.FindOne(ctx, bson.M{"name": name, "user_id": uID}).Decode(&business)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, nil
		}
		return nil, err
	}
	return &business, nil
}
