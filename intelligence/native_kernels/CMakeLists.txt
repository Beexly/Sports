cmake_minimum_required(VERSION 3.20)
project(gse_native_kernels LANGUAGES C CXX)

set(CMAKE_C_STANDARD 11)
set(CMAKE_C_STANDARD_REQUIRED ON)
set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

add_compile_options(-O3 -Wall -Wextra)

include_directories(${CMAKE_CURRENT_SOURCE_DIR}/include)

add_library(gse_native_kernels SHARED
    src/gse_c_sinkhorn_and_dk_scoring.c
    src/gse_cpp_trajectory_and_copula.cpp
)
target_compile_definitions(gse_native_kernels PRIVATE GSE_BUILDING_DLL)

add_executable(test_native_kernels
    tests/test_native_kernels_main.cpp
    src/gse_c_sinkhorn_and_dk_scoring.c
    src/gse_cpp_trajectory_and_copula.cpp
)
target_compile_definitions(test_native_kernels PRIVATE GSE_BUILDING_DLL)
