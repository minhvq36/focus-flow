package profanity

import (
	"bufio"
	"os"
	"strings"
)

type Filter struct {
	badWords  []string
	whitelist []string
}

// NewFilter khởi tạo bộ lọc bằng cách đọc 2 file txt
func NewFilter(badWordsPath, whitelistPath string) (*Filter, error) {
	badWords, err := loadFile(badWordsPath)
	if err != nil {
		return nil, err
	}

	whitelist, err := loadFile(whitelistPath)
	if err != nil {
		// Có thể log warning nếu file không tồn tại, nhưng hiện tại cứ trả về lỗi
		return nil, err
	}

	return &Filter{
		badWords:  badWords,
		whitelist: whitelist,
	}, nil
}

func loadFile(path string) ([]string, error) {
	file, err := os.Open(path)
	if err != nil {
		return nil, err
	}
	defer file.Close()

	var words []string
	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		// Đã bọc an toàn: Cắt khoảng trắng và loại bỏ dòng rỗng
		word := strings.TrimSpace(scanner.Text())
		if word != "" {
			words = append(words, strings.ToLower(word))
		}
	}
	return words, scanner.Err()
}

func (f *Filter) IsProfane(text string) bool {
	textLower := strings.ToLower(strings.TrimSpace(text))

	for _, safeWord := range f.whitelist {
		textLower = strings.ReplaceAll(textLower, safeWord, " ")
	}

	for _, badWord := range f.badWords {
		if strings.Contains(textLower, badWord) {
			return true
		}
	}

	return false
}
