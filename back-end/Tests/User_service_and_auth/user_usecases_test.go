package tests

import (
	"errors"
	"testing"

	domain "shop-ops/Domain"
	usecases "shop-ops/Usecases"

	"github.com/golang-jwt/jwt/v5"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// --- Mocks ---

type MockUserRepository struct {
	mock.Mock
}

func (m *MockUserRepository) Save(user *domain.User) error {
	args := m.Called(user)
	return args.Error(0)
}

func (m *MockUserRepository) FindById(id string) (*domain.User, error) {
	args := m.Called(id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.User), args.Error(1)
}

func (m *MockUserRepository) FindByPhone(phone string) (*domain.User, error) {
	args := m.Called(phone)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.User), args.Error(1)
}

func (m *MockUserRepository) FindByEmail(email string) (*domain.User, error) {
	args := m.Called(email)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.User), args.Error(1)
}

func (m *MockUserRepository) Update(user *domain.User) error {
	args := m.Called(user)
	return args.Error(0)
}

type MockPasswordService struct {
	mock.Mock
}

func (m *MockPasswordService) Hash(password string) (string, error) {
	args := m.Called(password)
	return args.String(0), args.Error(1)
}

func (m *MockPasswordService) Compare(password, hash string) bool {
	args := m.Called(password, hash)
	return args.Bool(0)
}

type MockJWTService struct {
	mock.Mock
}

func (m *MockJWTService) GenerateToken(userId string) (string, error) {
	args := m.Called(userId)
	return args.String(0), args.Error(1)
}

func (m *MockJWTService) GenerateRefreshToken(userId string) (string, error) {
	args := m.Called(userId)
	return args.String(0), args.Error(1)
}

func (m *MockJWTService) ValidateToken(tokenString string) (*jwt.Token, error) {
	args := m.Called(tokenString)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*jwt.Token), args.Error(1)
}

// --- Tests ---

func TestRegister(t *testing.T) {
	mockRepo := new(MockUserRepository)
	mockPwd := new(MockPasswordService)
	mockJWT := new(MockJWTService)
	uc := usecases.NewUserUseCases(mockRepo, mockPwd, mockJWT)

	req := &usecases.RegisterRequest{
		Name:     "Test User",
		Phone:    "1234567890",
		Email:    "test@example.com",
		Password: "password123",
	}

	t.Run("Success", func(t *testing.T) {
		mockRepo.On("FindByPhone", req.Phone).Return(nil, nil).Once()
		mockRepo.On("FindByEmail", req.Email).Return(nil, nil).Once()
		mockPwd.On("Hash", req.Password).Return("hashed_password", nil).Once()
		mockRepo.On("Save", mock.AnythingOfType("*domain.User")).Return(nil).Once()

		user, err := uc.Register(req)

		assert.NoError(t, err)
		assert.NotNil(t, user)
		assert.Equal(t, req.Name, user.Name)
		assert.Equal(t, req.Phone, user.Phone)
		assert.Equal(t, "hashed_password", user.PasswordHash)
		mockRepo.AssertExpectations(t)
		mockPwd.AssertExpectations(t)
	})

	t.Run("Duplicate Phone", func(t *testing.T) {
		existingUser := &domain.User{Phone: req.Phone}
		mockRepo.On("FindByPhone", req.Phone).Return(existingUser, nil).Once()

		user, err := uc.Register(req)

		assert.Error(t, err)
		assert.Nil(t, user)
		assert.Contains(t, err.Error(), "user with this phone already exists")
		mockRepo.AssertExpectations(t)
	})
}

func TestLogin(t *testing.T) {
	mockRepo := new(MockUserRepository)
	mockPwd := new(MockPasswordService)
	mockJWT := new(MockJWTService)
	uc := usecases.NewUserUseCases(mockRepo, mockPwd, mockJWT)

	phone := "1234567890"
	password := "password123"
	hashedPassword := "hashed_password"
	userID := primitive.NewObjectID()

	user := &domain.User{
		ID:           userID,
		Phone:        phone,
		PasswordHash: hashedPassword,
	}

	t.Run("Success", func(t *testing.T) {
		mockRepo.On("FindByPhone", phone).Return(user, nil).Once()
		mockPwd.On("Compare", password, hashedPassword).Return(true).Once()
		mockJWT.On("GenerateToken", userID.Hex()).Return("access_token", nil).Once()
		mockJWT.On("GenerateRefreshToken", userID.Hex()).Return("refresh_token", nil).Once()

		resp, err := uc.Login(phone, password)

		assert.NoError(t, err)
		assert.NotNil(t, resp)
		assert.Equal(t, "access_token", resp.Token)
		assert.Equal(t, "refresh_token", resp.RefreshToken)
		mockRepo.AssertExpectations(t)
		mockPwd.AssertExpectations(t)
		mockJWT.AssertExpectations(t)
	})

	t.Run("Invalid Credentials (User Not Found)", func(t *testing.T) {
		mockRepo.On("FindByPhone", phone).Return(nil, nil).Once()

		resp, err := uc.Login(phone, password)

		assert.Error(t, err)
		assert.Nil(t, resp)
		assert.Contains(t, err.Error(), "invalid credentials")
		mockRepo.AssertExpectations(t)
	})

	t.Run("Invalid Credentials (Wrong Password)", func(t *testing.T) {
		mockRepo.On("FindByPhone", phone).Return(user, nil).Once()
		mockPwd.On("Compare", password, hashedPassword).Return(false).Once()

		resp, err := uc.Login(phone, password)

		assert.Error(t, err)
		assert.Nil(t, resp)
		assert.Contains(t, err.Error(), "invalid credentials")
		mockRepo.AssertExpectations(t)
	})
}

func TestGetProfile(t *testing.T) {
	mockRepo := new(MockUserRepository)
	mockPwd := new(MockPasswordService)
	mockJWT := new(MockJWTService)
	uc := usecases.NewUserUseCases(mockRepo, mockPwd, mockJWT)

	userID := primitive.NewObjectID().Hex()
	user := &domain.User{Name: "Test User"}

	t.Run("Success", func(t *testing.T) {
		mockRepo.On("FindById", userID).Return(user, nil).Once()

		result, err := uc.GetProfile(userID)

		assert.NoError(t, err)
		assert.Equal(t, user, result)
		mockRepo.AssertExpectations(t)
	})

	t.Run("Error", func(t *testing.T) {
		mockRepo.On("FindById", userID).Return(nil, errors.New("db error")).Once()

		result, err := uc.GetProfile(userID)

		assert.Error(t, err)
		assert.Nil(t, result)
		mockRepo.AssertExpectations(t)
	})
}

func TestUpdateProfile(t *testing.T) {
	userID := primitive.NewObjectID()
	req := &usecases.UpdateProfileRequest{
		Name:  "New Name",
		Email: "new@example.com",
	}

	t.Run("Success", func(t *testing.T) {
		mockRepo := new(MockUserRepository)
		uc := usecases.NewUserUseCases(mockRepo, new(MockPasswordService), new(MockJWTService))
		user := &domain.User{ID: userID, Name: "Old Name", Email: "old@example.com"}

		mockRepo.On("FindById", userID.Hex()).Return(user, nil).Once()
		mockRepo.On("FindByEmail", req.Email).Return(nil, nil).Once()
		mockRepo.On("Update", mock.MatchedBy(func(u *domain.User) bool {
			return u.Name == req.Name && u.Email == req.Email && !u.UpdatedAt.IsZero()
		})).Return(nil).Once()

		updatedUser, err := uc.UpdateProfile(userID.Hex(), req)

		assert.NoError(t, err)
		assert.Equal(t, req.Name, updatedUser.Name)
		assert.Equal(t, req.Email, updatedUser.Email)
		mockRepo.AssertExpectations(t)
	})

	t.Run("Duplicate Email", func(t *testing.T) {
		mockRepo := new(MockUserRepository)
		uc := usecases.NewUserUseCases(mockRepo, new(MockPasswordService), new(MockJWTService))
		user := &domain.User{ID: userID, Name: "Old Name", Email: "old@example.com"}

		mockRepo.On("FindById", userID.Hex()).Return(user, nil).Once()

		existingUser := &domain.User{Email: req.Email}
		mockRepo.On("FindByEmail", req.Email).Return(existingUser, nil).Once()

		updatedUser, err := uc.UpdateProfile(userID.Hex(), req)

		assert.Error(t, err)
		assert.Nil(t, updatedUser)
		assert.Equal(t, "user with this email already exists", err.Error())
		mockRepo.AssertExpectations(t)
	})

	t.Run("User Not Found", func(t *testing.T) {
		mockRepo := new(MockUserRepository)
		uc := usecases.NewUserUseCases(mockRepo, new(MockPasswordService), new(MockJWTService))

		mockRepo.On("FindById", userID.Hex()).Return(nil, nil).Once()

		updatedUser, err := uc.UpdateProfile(userID.Hex(), req)

		assert.Error(t, err)
		assert.Nil(t, updatedUser)
		assert.Equal(t, "user not found", err.Error()) // Important for checking controller logic!
		mockRepo.AssertExpectations(t)
	})
}
