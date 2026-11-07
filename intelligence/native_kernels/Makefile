CC = gcc
CXX = g++
CFLAGS = -std=c11 -O3 -march=native -Wall -Wextra -Werror -Iinclude -DGSE_BUILDING_DLL
CXXFLAGS = -std=c++20 -O3 -march=native -Wall -Wextra -Werror -Iinclude -DGSE_BUILDING_DLL

DLL_TARGET = bin/libgse_native_kernels.dll
TEST_TARGET = bin/test_native_kernels.exe

all: $(DLL_TARGET) $(TEST_TARGET)

$(DLL_TARGET): src/gse_c_sinkhorn_and_dk_scoring.c src/gse_cpp_trajectory_and_copula.cpp
	@mkdir -p bin
	$(CC) $(CFLAGS) -c src/gse_c_sinkhorn_and_dk_scoring.c -o bin/gse_c_sinkhorn_and_dk_scoring.o
	$(CXX) $(CXXFLAGS) -c src/gse_cpp_trajectory_and_copula.cpp -o bin/gse_cpp_trajectory_and_copula.o
	$(CXX) -shared -o $(DLL_TARGET) bin/gse_c_sinkhorn_and_dk_scoring.o bin/gse_cpp_trajectory_and_copula.o -static-libgcc -static-libstdc++

$(TEST_TARGET): tests/test_native_kernels_main.cpp bin/gse_c_sinkhorn_and_dk_scoring.o bin/gse_cpp_trajectory_and_copula.o
	$(CXX) $(CXXFLAGS) tests/test_native_kernels_main.cpp bin/gse_c_sinkhorn_and_dk_scoring.o bin/gse_cpp_trajectory_and_copula.o -o $(TEST_TARGET) -static-libgcc -static-libstdc++

test: $(TEST_TARGET)
	./$(TEST_TARGET)

clean:
	rm -rf bin/*.o $(DLL_TARGET) $(TEST_TARGET)
