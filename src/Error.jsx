import { Link, useRouteError } from "react-router-dom";
import { Button, Result } from "antd";

export default function ErrorPage() {
    return (
        <div id="error-page">
            <Result
                status="404"
                title="Oops!"
                subTitle={"Trang Không Tồn Tại"}
                extra={
                    <Button type="primary">
                        <Link to="/customer">
                            <span>Quay Về Trang Chủ</span>
                        </Link>
                    </Button>
                }
            />
        </div>
    );
}