export default function FullLoader() {
    return (
        <div className="w-full h-full fixed top-0 left-0 flex justify-center items-center z-[10000000] bg-[#00000091]">
            <svg
                xmlns="http://www.w3.org/2000/svg"
                width="50"
                height="50"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={"animate-spin text-white"}
            >
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </svg>
        </div>
    )
}