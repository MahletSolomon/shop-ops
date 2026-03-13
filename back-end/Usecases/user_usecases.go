package usecases

import (
	"errors"
	"regexp"
	"time"

	domain "shop-ops/Domain"
	repositories "shop-ops/Repositories"

	"github.com/golang-jwt/jwt/v5"
)

// Service interfaces needed by UserUseCases
type PasswordService interface {
	Hash(password string) (string, error)
	Compare(password, hash string) bool
}

type JWTService interface {
	GenerateToken(userId string) (string, error)
	GenerateRefreshToken(userId string) (string, error)
	ValidateToken(tokenString string) (*jwt.Token, error)
}

type RegisterRequest struct {
	Name     string `json:"name"`
	Phone    string `json:"phone"`
	Email    string `json:"email"`
	Password string `json:"password"`
}

type LoginResponse struct {
	Token        string       `json:"token"`
	RefreshToken string       `json:"refresh_token"`
	User         *domain.User `json:"user"`
}

type UpdateProfileRequest struct {
	Name  string `json:"name"`
	Email string `json:"email"`
}

type ChangePasswordRequest struct {
	CurrentPassword string `json:"current_password"`
	NewPassword     string `json:"new_password"`
}

type ChangePhoneRequest struct {
	CurrentPassword string `json:"current_password"`
	NewPhone        string `json:"new_phone"`
}

type UserUseCases interface {
	Register(req *RegisterRequest) (*domain.User, error)
	Login(phone, password string) (*LoginResponse, error)
	RefreshToken(refreshToken string) (*LoginResponse, error)
	GetProfile(userId string) (*domain.User, error)
	UpdateProfile(userId string, req *UpdateProfileRequest) (*domain.User, error)
	ChangePassword(userId string, req *ChangePasswordRequest) error
	ChangePhone(userId string, req *ChangePhoneRequest) (*domain.User, error)
}

type userUseCases struct {
	userRepo   repositories.UserRepository
	pwdService PasswordService
	jwtService JWTService
}

func NewUserUseCases(userRepo repositories.UserRepository, pwdService PasswordService, jwtService JWTService) UserUseCases {
	return &userUseCases{
		userRepo:   userRepo,
		pwdService: pwdService,
		jwtService: jwtService,
	}
}

func (u *userUseCases) Register(req *RegisterRequest) (*domain.User, error) {
	// Check if user exists by phone
	existingUser, _ := u.userRepo.FindByPhone(req.Phone)
	if existingUser != nil {
		return nil, errors.New("user with this phone already exists")
	}

	// Check if user exists by email if provided
	if req.Email != "" {
		existingUser, _ = u.userRepo.FindByEmail(req.Email)
		if existingUser != nil {
			return nil, errors.New("user with this email already exists")
		}
	}

	// Hash password
	hashedPwd, err := u.pwdService.Hash(req.Password)
	if err != nil {
		return nil, err
	}

	userInfo := domain.NewUser(req.Name, req.Phone, req.Email, hashedPwd)
	if err := userInfo.Validate(); err != nil {
		return nil, err
	}

	if err := u.userRepo.Save(userInfo); err != nil {
		return nil, err
	}

	return userInfo, nil
}

func (u *userUseCases) Login(phone, password string) (*LoginResponse, error) {
	user, err := u.userRepo.FindByPhone(phone)
	if err != nil || user == nil {
		return nil, errors.New("invalid credentials")
	}

	if !u.pwdService.Compare(password, user.PasswordHash) {
		return nil, errors.New("invalid credentials")
	}

	return u.generateTokens(user)
}

func (u *userUseCases) RefreshToken(refreshToken string) (*LoginResponse, error) {
	token, err := u.jwtService.ValidateToken(refreshToken)
	if err != nil || !token.Valid {
		return nil, errors.New("invalid refresh token")
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		return nil, errors.New("invalid token claims")
	}

	// Check token type
	if reqType, ok := claims["type"].(string); !ok || reqType != "refresh" {
		return nil, errors.New("invalid token type")
	}

	userId, ok := claims["user_id"].(string)
	if !ok {
		return nil, errors.New("invalid user id in token")
	}

	user, err := u.userRepo.FindById(userId)
	if err != nil || user == nil {
		return nil, errors.New("user not found")
	}

	return u.generateTokens(user)
}

func (u *userUseCases) generateTokens(user *domain.User) (*LoginResponse, error) {
	token, err := u.jwtService.GenerateToken(user.ID.Hex())
	if err != nil {
		return nil, err
	}

	refreshToken, err := u.jwtService.GenerateRefreshToken(user.ID.Hex())
	if err != nil {
		return nil, err
	}

	return &LoginResponse{
		Token:        token,
		RefreshToken: refreshToken,
		User:         user,
	}, nil
}

func (u *userUseCases) GetProfile(userId string) (*domain.User, error) {
	return u.userRepo.FindById(userId)
}

func (u *userUseCases) UpdateProfile(userId string, req *UpdateProfileRequest) (*domain.User, error) {
	user, err := u.userRepo.FindById(userId)
	if err != nil {
		return nil, err
	}
	if user == nil {
		return nil, errors.New("user not found")
	}

	if req.Name != "" {
		user.Name = req.Name
	}
	if req.Email != "" {
		// Check uniqueness if email changes
		if user.Email != req.Email {
			existingUser, _ := u.userRepo.FindByEmail(req.Email)
			if existingUser != nil {
				return nil, errors.New("user with this email already exists")
			}
		}
		user.Email = req.Email
	}
	user.UpdatedAt = time.Now()

	if err := u.userRepo.Update(user); err != nil {
		return nil, err
	}

	return user, nil
}

func (u *userUseCases) ChangePassword(userId string, req *ChangePasswordRequest) error {
	user, err := u.userRepo.FindById(userId)
	if err != nil {
		return err
	}
	if user == nil {
		return errors.New("user not found")
	}

	// Verify current password
	if !u.pwdService.Compare(req.CurrentPassword, user.PasswordHash) {
		return errors.New("invalid current password")
	}

	// Validate new password
	if len(req.NewPassword) < 8 {
		return errors.New("new password must be at least 8 characters")
	}

	// Hash new password
	hashedPwd, err := u.pwdService.Hash(req.NewPassword)
	if err != nil {
		return err
	}

	user.PasswordHash = hashedPwd
	user.UpdatedAt = time.Now()

	return u.userRepo.Update(user)
}

func (u *userUseCases) ChangePhone(userId string, req *ChangePhoneRequest) (*domain.User, error) {
	user, err := u.userRepo.FindById(userId)
	if err != nil {
		return nil, err
	}
	if user == nil {
		return nil, errors.New("user not found")
	}

	// Verify current password
	if !u.pwdService.Compare(req.CurrentPassword, user.PasswordHash) {
		return nil, errors.New("invalid current password")
	}

	// Validate new phone format (E.164)
	validPhone := regexp.MustCompile(`^\+[1-9]\d{1,14}$`)
	if !validPhone.MatchString(req.NewPhone) {
		return nil, errors.New("invalid phone format")
	}

	// Check uniqueness
	if user.Phone != req.NewPhone {
		existingUser, _ := u.userRepo.FindByPhone(req.NewPhone)
		if existingUser != nil {
			return nil, errors.New("user with this phone already exists")
		}
	}

	user.Phone = req.NewPhone
	user.UpdatedAt = time.Now()

	if err := u.userRepo.Update(user); err != nil {
		return nil, err
	}

	return user, nil
}
